class DisputesController < ApplicationController
  def pictures
    if request.xhr?
      render :partial => 'disputes/pictures'
    end
  end
end