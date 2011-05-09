Wrongler::Application.routes.draw do
  resources :auctions, :users
  
  resources :disputes do
    resources :comments
    member do
      get 'pictures'
    end
  end
  
  root :to => 'welcome#index'
  get 'help' => 'help#index'
end
