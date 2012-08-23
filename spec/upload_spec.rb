# this spec requires WebKit from Qt
# see https://github.com/thoughtbot/capybara-webkit/wiki/Installing-Qt-and-compiling-capybara-webkit
# the application must be running the background

# encoding: utf-8
require_relative "./spec_helper"

describe Upload do
  
  it "should upload a PDF and have it render", :js => true do
    visit "/"
    find("#file").should be_true
    file_path = File.join(SiteConfig.root_path, 'spec', 'files', 'dummy_file.pdf')
    attach_file "file", file_path
    click_button "Resolve"
    page.should have_content("Congratulations")
    page.should have_content("Yukon")
  end
end