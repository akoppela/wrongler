class UsersController < ApplicationController
  def friends
    if request.xhr?
      render :partial => 'users/friends', :content_type => :html
    end
  end
end
