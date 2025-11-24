#!/bin/bash

# Pre-push script that runs the same checks as CI
# Usage: ./scripts/pre-push.sh [--skip-smoke]

set -e  # Exit on any error

SKIP_SMOKE=false
if [[ "$1" == "--skip-smoke" ]]; then
  SKIP_SMOKE=true
fi

echo "🚀 Running pre-push checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Track if any step fails
FAILED=false

# Step 1: ESLint
print_step "Step 1/7: Running ESLint"
if npm run lint; then
  print_success "ESLint passed"
else
  print_error "ESLint failed"
  FAILED=true
fi

# Step 2: Prettier format check
print_step "Step 2/7: Checking code formatting with Prettier"
if npm run format:check; then
  print_success "Code formatting is correct"
else
  print_error "Code formatting check failed"
  echo ""
  print_warning "Run 'npm run format' to fix formatting issues"
  FAILED=true
fi

# Step 3: TypeScript type check
print_step "Step 3/7: Running TypeScript type check"
if npm run typecheck; then
  print_success "TypeScript type check passed"
else
  print_error "TypeScript type check failed"
  FAILED=true
fi

# Step 4: Knip (unused code detection)
print_step "Step 4/7: Running Knip (unused code detection)"
if npm run knip:production; then
  print_success "Knip check passed"
else
  print_error "Knip found issues"
  FAILED=true
fi

# Step 5: Unit tests with coverage
print_step "Step 5/7: Running unit tests with coverage"
if npm run test:unit:coverage; then
  print_success "Unit tests passed"
else
  print_error "Unit tests failed"
  FAILED=true
fi

# Step 6: Build (with base path for production)
print_step "Step 6/7: Building Next.js app (production)"
if NEXT_PUBLIC_BASE_PATH=/bleep-that-shit npm run build; then
  print_success "Production build successful"
else
  print_error "Production build failed"
  FAILED=true
fi

# Step 7: Smoke tests (optional)
if [ "$SKIP_SMOKE" = false ]; then
  print_step "Step 7/7: Running smoke tests"

  # Build for smoke tests (without base path)
  echo "Building app for smoke tests..."
  if npm run build; then
    print_success "Smoke test build successful"
  else
    print_error "Smoke test build failed"
    FAILED=true
  fi

  # Check if Playwright browsers are installed
  if ! npx playwright --version &> /dev/null; then
    print_warning "Playwright not found, installing..."
    npx playwright install chromium --with-deps
  fi

  # Run smoke tests
  if CI=true npm run test:smoke; then
    print_success "Smoke tests passed"
  else
    print_error "Smoke tests failed"
    FAILED=true
  fi
else
  print_warning "Skipping smoke tests (use without --skip-smoke to run them)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" = true ]; then
  print_error "Pre-push checks FAILED"
  echo ""
  echo "Please fix the issues above before pushing."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
else
  print_success "All pre-push checks PASSED"
  echo ""
  echo "Your code is ready to push! 🎉"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
