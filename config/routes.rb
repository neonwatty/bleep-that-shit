Rails.application.routes.draw do
  get "vite_test/index"
  resources :users, only: [:new, :create]
  resources :sessions, only: [:new, :create, :destroy]

  root "sessions#new"

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"

  # Mount ActiveStorage routes for direct uploads
  # This enables POST /rails/active_storage/direct_uploads
  direct_uploads = defined?(ActiveStorage::Engine) ? ActiveStorage::Engine : nil
  mount direct_uploads => '/rails/active_storage' if direct_uploads

  # Override direct_uploads route to use custom controller with CSRF skip
  post "/rails/active_storage/direct_uploads", to: "active_storage_direct_uploads#create"

  # Rename the test route
  get 'transcription-view', to: 'pages#transcription_view'

  # Add the bleep-view route
  get 'bleep-view', to: 'pages#bleep_view'

  # All transcription is handled client-side; no backend routes needed.
end
