/*global $, jQuery, window, document, self, setTimeout, PDFView, mozL10n, XMLHttpRequest, alert, encodeURIComponent, _gaq */

var Reconciler = Reconciler || { 'settings': {} };

$(function() {

  "use strict";

  Reconciler.status = {
    "init"         : 0,
    "find_sent"    : 1,
    "find_busy"    : 2,
    "found"        : 3,
    "resolve_sent" : 4,
    "resolve_busy" : 5,
    "resolved"     : 6,
    "failed"       : 7
  };

  Reconciler.vars = {
    timeout     : 5000,
    names_found : false,
    verbatim    : []
  };

  Reconciler.initialize = function() {
    var self = this;

    if(!PDFView.pages) {
      this.hideLoaders();
      return;
    }

    this.getNames(0);
    this.activateNamesButton();

    setTimeout(function checkStatus() {
      var views = PDFView.getVisiblePages();
      if(self.checkRenderingState()) {
        self.detectScroll();
      } else {
        setTimeout(checkStatus, 50);
      }
    }, 50);
  };

  Reconciler.checkRenderingState = function() {
   if(PDFView.textRenderingDone) {
     this.highlightNames();
     return true;
   }
   return false;
  };

  Reconciler.detectScroll = function() {
    window.addEventListener('scroll', this.highlightNames, true);
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
  };

  Reconciler.getNames = function(counter) {
    var self = this;

    $.ajax({
      type     : 'GET',
      async    : true,
      url      : '/get_names?token=' + self.settings.token,
      dataType : 'json',
      timeout  : self.vars.timeout,
      success  : function(response) {
        self.updateStatus(response.status);
        if(response.status === self.status.resolved) {
          self.buildNames(response);
          self.renderNames();
        }
      },
      error : function(xhr, ajaxOptions, thrownError) {
        xhr = thrownError = null;
        if(ajaxOptions === 'timeout' && counter < 15) {
          counter += 1;
          self.getNames(counter);
        } else {
          self.updateStatus(Reconciler.status.failed);
        }
      }
    });
  };

  Reconciler.updateStatus = function(status) {
    var self   = this,
        text   = "",
        loader = $('#nameLoader'),
        viewer = $('#namesView').find(".looking");

    switch(status) {
      case this.status.find_sent:
      case this.status.find_busy:
        setTimeout(function() { self.getNames(0); }, self.vars.timeout);
        break;
      case this.status.found:
        text = mozL10n.get('found_names', null, 'Found names...');
        loader.text(text);
        viewer.text(text);
        setTimeout(function() { self.getNames(0); }, self.vars.timeout);
        break;
      case this.status.resolve_sent:
      case this.status.resolve_busy:
        text = mozL10n.get('resolving_names', null, 'Resolving names...');
        loader.text(text);
        viewer.text(text);
        setTimeout(function() { self.getNames(0); }, self.vars.timeout);
        break;
      case this.status.resolved:
        loader.hide();
        viewer.hide();
        break;
      case this.status.failed:
        loader.hide();
        $('#nameLoaderFailed').show();
        viewer.hide().end().find(".failed").show();
        break;
    }
  };

  Reconciler.buildNames = function(response) {
    var self = this;

    $.each(response.data, function() {
      if($.inArray(this.supplied_name_string, self.vars.verbatim) === -1) { self.vars.verbatim.push(this.supplied_name_string); }
    });
    this.vars.names_found = true;
  };

  Reconciler.compareStringLengths = function(a, b) {
    if (a.length < b.length) { return 1;  }
    if (a.length > b.length) { return -1; }
    return 0;
  };

  Reconciler.renderNames = function() {
    var self = this,
        namesButton  = $('#viewNames'),
        namesView    = $('#namesView'),
        searchPanel  = $('#viewSearch'),
        searchInput  = $('#searchTermsInput'),
        searchButton = $('#searchButton'),
        item = '';

    if(self.vars.verbatim.length === 0) {
      namesView.find(".noResults").eq(0).show();
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

  Reconciler.highlightNames = function() {
    var current_page = {};
    if(Reconciler.vars.verbatim.length > 0) {
      current_page = PDFView.pages[window.currentPageNumber-1];
      if(current_page.renderingState === 3 && $('.highlight', '#pageContainer' + window.currentPageNumber).length === 0) {
        $('.textLayer', '#pageContainer' + window.currentPageNumber).unhighlight().highlight(Reconciler.vars.verbatim.sort(Reconciler.compareStringLengths), { wordsOnly : true });
      }
    }
  };

  Reconciler.initialize();

});