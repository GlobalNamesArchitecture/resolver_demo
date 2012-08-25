/*global $, jQuery, window, document, self, XMLHttpRequest, alert, encodeURIComponent, _gaq */

var Reconciler = Reconciler || { 'settings': {} };

$(function() {

  "use strict";

  Reconciler.vars = {
    names_found : false,
    verbatim    : []
  };

  Reconciler.initialize = function() {
    this.activateNamesButton();
    this.getNames(0);
  };

  Reconciler.activateNamesButton = function() {
    $('#viewNames').click(function(e) {
      e.preventDefault();
      PDFView.extractText();
      $('#toolbarSidebar').children().removeClass('toggled');
      $('#sidebarContent').children().addClass('hidden');
      $(this).addClass('toggled');
      $('#namesView').removeClass('hidden');
    });
  }

  Reconciler.getNames = function(counter) {
    var self = this;

    $.ajax({
      type     : 'GET',
      async    : true,
      url      : '/get_names?token=' + self.settings.token,
      dataType : 'json',
      timeout  : 10000,
      success  : function(response) {
        self.buildNames(response);
        self.renderNames();
        $('#nameLoader').fadeOut();
      },
      error : function(xhr, ajaxOptions, thrownError) {
        if(ajaxOptions === 'timeout' && counter < 10) {
          counter++;
          self.getNames(counter);
        }
      }
    });
  };

  Reconciler.buildNames = function(response) {
    var self = this;

    $.each(response.verbatim_names, function() {
      if($.inArray(this, self.vars.verbatim) === -1) { self.vars.verbatim.push(this); }
    });
    this.vars.verbatim.sort(this.compareStringLengths);
    this.vars.names_found = true;
  };

  Reconciler.compareStringLengths = function(a, b) {
    if (a.length < b.length) { return 1;  }
    if (a.length > b.length) { return -1; }
    return 0;
  };

  Reconciler.renderNames = function() {
    var self = this,
        namesButton = $('#viewNames'),
        namesView   = $('#namesView'),
        searchPanel = $('#viewSearch'),
        searchInput = $('#searchTermsInput'),
        searchButton = $('#searchButton'),
        item = '';

    if(namesView.attr("data-status") === "complete") { return; }

    setTimeout(function appendNames() {
      if(self.vars.names_found) {
        namesView.find(".looking").fadeOut();
        if(self.vars.verbatim.length > 0) {
          $.each(self.vars.verbatim.sort(), function() {
            item = $('<a href="#">' + this + '</a>');
            namesView.append(item);
            $(item).click(function(e) {
              e.preventDefault();
              namesView.addClass('hidden');
              namesButton.removeClass('toggled');
              searchPanel.trigger('click');
              searchInput.val($(this).text());
              searchButton.trigger('click');
            });
          });
        } else {
          namesView.find(".nothing").show();
        }
        namesView.attr("data-status", "complete");
      } else {
        setTimeout(appendNames, 10);
      }
    }, 10)

  };

  Reconciler.initialize();

});