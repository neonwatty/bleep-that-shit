# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.4.2
FROM ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development"

# Install system dependencies: ruby gems & Node/Vite build tools
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      curl libjemalloc2 libvips sqlite3 \
      nodejs npm && \
    rm -rf /var/lib/apt/lists/*

FROM base AS build

# Add build-only dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential git libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install Ruby gems
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/* && \
    bundle exec bootsnap precompile --gemfile

# Install JS dependencies and build assets
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build     # or: ./bin/vite build

# Rails precompile (this will also build assets via vite_rails if configured)
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

FROM base AS final

# Copy built artifacts
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails

# Create non-root user
RUN groupadd --system --gid 1000 rails && \
    useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash rails && \
    chown -R rails:rails /rails/{db,log,storage,tmp}

USER rails

WORKDIR /rails

ENTRYPOINT ["./bin/docker-entrypoint"]
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
