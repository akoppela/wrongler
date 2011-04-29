Wrongler::Application.routes.draw do
  resources :auctions, :users
  
  resources :disputes do
    resources :comments
  end
  
  root :to => "welcome#index"
end
