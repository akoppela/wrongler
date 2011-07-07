class DisputesController < ApplicationController
  def pictures
    if request.xhr?
      render :partial => 'disputes/pictures', :content_type => :html
    end
  end
end