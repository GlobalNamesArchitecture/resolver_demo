/*global $, jQuery, window, document, self, XMLHttpRequest, alert, encodeURIComponent, _gaq */

var Reconciler = Reconciler || { 'settings': {} };

$(function() {

  "use strict";

  Reconciler.status = {
    "init"      : 0,
    "sent"      : 1,
    "completed" : 2,
    "failed"    : 3
  };

  Reconciler.vars = {
    names_found : false,
    verbatim    : []
  };

  Reconciler.initialize = function() {
    this.activateNamesButton();
    this.getNames(0);
  };

  Reconciler.activateNamesButton = function() {
    $.each($('#toolbarSidebar').children(), function(i) {
      $(this).click(function(e) {
        e.preventDefault();
        if($(this).attr("id") === 'viewNames') { PDFView.extractText(); }
        $(this).addClass('toggled').siblings().removeClass('toggled');
        $('#sidebarContent').children().eq(i).show().siblings().hide();
      });
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
        if(response.status === self.status.completed) {
          self.buildNames(response);
          self.renderNames();
        } else {
          self.failed();
        }
      },
      error : function(xhr, ajaxOptions, thrownError) {
        if(ajaxOptions === 'timeout' && counter < 10) {
          counter++;
          self.getNames(counter);
        } else {
          self.failed();
        }
      }
    });
  };

  Reconciler.failed = function() {
    this.hideLoaders();
    $('#nameLoaderFailed').show();
    $('#namesView').find(".failed").show();
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

  Reconciler.hideLoaders = function() {
    $('#nameLoader').hide();
    $('#namesView').find(".looking").hide();
  };

  Reconciler.renderNames = function() {
    var self = this,
        namesButton = $('#viewNames'),
        namesView   = $('#namesView'),
        searchPanel = $('#viewSearch'),
        searchInput = $('#searchTermsInput'),
        searchButton = $('#searchButton'),
        item = '';

    self.hideLoaders();

    if(self.vars.verbatim.length === 0) {
      namesView.find(".noResults").show();
      return;
    }

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

  };

  Reconciler.initialize();

});