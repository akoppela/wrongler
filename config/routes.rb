Wrongler::Application.routes.draw do
  resources :disputes
  
  root :to => "welcome#index"
end
