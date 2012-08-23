# encoding: utf-8
require_relative "./spec_helper"

describe "/" do 
  it "should open home page" do
    get "/"
    r = last_response
    r.status.should == 200
    r.body.match("PDF").should be_true
  end
end

describe "/resolver" do

  it "should throw not found" do
    get "/nothing"
    r = last_response
    r.status.should == 404
    r.body.match("hat page does not exist").should be_true
  end
  
  it "should throw not found if there are no parameters" do
    get "/reconciler"
    r = last_response
    r.status.should == 404
    r.body.match("hat page does not exist").should be_true
  end

  it "should throw not found if a token does not exist" do
    get "/reconciler?token=9999"
    r = last_response
    r.status.should == 404
    r.body.match("hat page does not exist").should be_true
  end

  it "should throw a message if an uploaded file is not a PDF" do
    file = File.join(SiteConfig.root_path, 'spec', 'files', 'dummy_file.txt')
    post('/reconciler', :file => Rack::Test::UploadedFile.new(file, 'text/plain'))
    last_response.status.should == 302
    follow_redirect!
    r = last_response
    r.status.should == 200
    r.body.match("Files must be of type PDF.").should be_true
  end

  it "should show an uploaded file if it's a PDF" do
    file = File.join(SiteConfig.root_path, 'spec', 'files', 'dummy_file.pdf')
    post('/reconciler', :file => Rack::Test::UploadedFile.new(file, 'application/pdf'))
    last_response.status.should == 302
    follow_redirect!
    r = last_response
    r.status.should == 200
    r.body.match("errorClose").should be_true
    r.body.match("Fullscreen").should be_true
  end

end