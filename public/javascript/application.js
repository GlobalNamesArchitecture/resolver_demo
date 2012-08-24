/*global $, jQuery, window, document, self, XMLHttpRequest, alert, encodeURIComponent, _gaq */

var Reconciler = Reconciler || { 'settings': {} };

$(function() {

  "use strict";

  Reconciler.vars = {
    viewer          : {},
    pageText        : "",
    foundNames      : false,
    identifiedNames : []
  };

  Reconciler.initialize = function(obj) {
    this.vars.viewer = obj;
    this.getPageText();
    this.getNames(0);
  };

  Reconciler.getNames = function(counter) {
    var self = this;

    $.ajax({
      type     : 'GET',
      async    : true,
      url      : '/get_names?token=' + self.settings.token,
      dataType : 'json',
      timeout  : 8000,
      success  : function(response) {
        self.buildNames(response);
        self.vars.foundNames = true;
      },
      error : function(xhr, ajaxOptions, thrownError) {
        if(ajaxOptions === 'timeout' && counter < 10) {
          counter++;
          self.getNames(counter);
        }
      }
    });
  };

  Reconciler.getPageText = function() {
    var self = this;

    self.vars.viewer.extractText();
    setTimeout(function checkforText() {
      if(self.vars.viewer.pageText[self.vars.viewer.pages.length-1]) {
        self.setPageText(self.vars.viewer.pageText.join());
      } else {
        setTimeout(checkforText, 10);
      }
    }, 10);
  };

  Reconciler.setPageText = function(value) {
    this.vars.pageText = value;
  };

  Reconciler.buildNames = function(response) {
    var self = this;

    $.each(response.names, function() {
      if($.inArray(this.identifiedName, self.vars.identifiedNames) === -1) { self.vars.identifiedNames.push(this.identifiedName); }
    });
    this.vars.identifiedNames.sort(this.compareStringLengths);
  };

  Reconciler.compareStringLengths = function(a, b) {
    if (a.length < b.length) { return 1;  }
    if (a.length > b.length) { return -1; }
    return 0;
  };

  //TODO
  Reconciler.highlight = function(obj) {
  var self = this,
      children = $('#' + obj.el.id).find(".textLayer").children().size();
  };

  Reconciler.renderNames = function() {
    var self = this,
        nameResults = $('#namesView').removeAttr('hidden'),
        searchPanel = $('#viewSearch'),
        searchInput = $('#searchTermsInput'),
        searchButton = $('#searchButton'),
        item = '';

    if(nameResults.attr("data-status") === "complete") { return; }

    nameResults.append('<div class="looking">Looking for names...</div>');

    setTimeout(function appendNames() {
      if(self.vars.foundNames) {
        nameResults.find(".looking").remove();
        if(self.vars.identifiedNames.length > 0) {
          $.each(self.vars.identifiedNames.sort(), function() {
            item = $('<a href="#">' + this + '</a>');
            nameResults.append(item);
            $(item).click(function(e) {
              e.preventDefault();
              searchPanel.trigger('click');
              searchInput.val($(this).text());
              searchButton.trigger('click');
            });
          });
        } else {
          nameResults.append('<div class="nothing">No names found</div>');
        }
        nameResults.attr("data-status", "complete");
      } else {
        setTimeout(appendNames, 10);
      }
    }, 10)

  };

});