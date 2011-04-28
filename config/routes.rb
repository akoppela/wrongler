Wrongler::Application.routes.draw do
  resources :disputes, :auctions
  
  root :to => "welcome#index"
end
