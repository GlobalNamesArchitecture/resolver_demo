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
    names       : [],
    names_data  : {},
    highlighted : []
  };

  Reconciler.initialize = function() {
    var self = this;

    if(!PDFView.pages) {
      this.hideLoaders();
      return;
    }

    this.getNames(0);
    this.activateNamesButton();
    this.detectZoom();

    setTimeout(function checkStatus() {
      if(self.checkRenderingState() && self.vars.names_found) {
        self.resetHighlightState();
        self.highlightNames();
        window.addEventListener('scroll', self.detectScroll, true);
      } else {
        setTimeout(checkStatus, 50);
      }
    }, 50);
  };

  Reconciler.checkRenderingState = function() {
   if(PDFView.textRenderingDone[window.currentPageNumber]) {
     return true;
   }
   return false;
  };

  Reconciler.detectZoom = function() {
    var self = this;

    $('#scaleSelect').change(function() {
      self.resetHighlightState();
      setTimeout(function checkStatus() {
        if(self.checkRenderingState()) {
          self.highlightNames();
        } else {
          setTimeout(checkStatus, 50);
        }
      }, 50);
    });
  };

  Reconciler.detectScroll = function() {
    if(Reconciler.checkRenderingState()) { Reconciler.highlightNames(); }
  };

  Reconciler.resetHighlightState = function() {
    var self = this;

    $.each(PDFView.pages, function() { self.vars.highlighted[this.id] = false; });
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
          self.buildLink(response);
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
      self.vars.names_data[this.supplied_name_string] = this.results[0];
      if($.inArray(this.supplied_name_string, self.vars.names) === -1) { self.vars.names.push(this.supplied_name_string); }
    });
    this.vars.names.sort(this.compareStringLengths);
    this.vars.names_found = true;
  };

  Reconciler.compareStringLengths = function(a, b) {
    if (a.length < b.length) { return 1;  }
    if (a.length > b.length) { return -1; }
    return 0;
  };

  Reconciler.renderNames = function() {
    var self = this,
        names        = self.vars.names.slice(),
        namesButton  = $('#viewNames'),
        namesView    = $('#namesView'),
        searchPanel  = $('#viewSearch'),
        searchInput  = $('#searchTermsInput'),
        searchButton = $('#searchButton'),
        item = '';

    if(self.vars.names.length === 0) {
      namesView.find(".noResults").eq(0).show();
      return;
    }

    $.each(names.sort(), function() {
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

  Reconciler.buildLink = function(response) {
    var link = '<a href="' + response.url.replace(".json", "") + '" target="_blank">' + mozL10n.get('resolved_link', null, 'Names Details') + '</a>'

    $('#nameLoader').html(link).removeClass("loader").show();
  };

  Reconciler.highlightNames = function() {
    var self = this, name_data;

    if(this.vars.names.length > 0 && !this.vars.highlighted[window.currentPageNumber]) {
      $('.textLayer', '#pageContainer' + window.currentPageNumber).highlight(this.vars.names, { wordsOnly : true }).find(".highlight").each(function() {
        name_data = self.vars.names_data[$(this).text().replace(/\u00a0/g, " ")];
        if(name_data && name_data.current_name_string) {
          $(this).addClass("synonymized").attr("title", name_data.current_name_string).qtip({ content : { title : { text : mozL10n.get('current_name', null, 'Current Name'), button : true } }, hide : false, style : { classes : 'ui-tooltip-dark ui-tooltip-rounded' } });
        }
      });
      this.vars.highlighted[window.currentPageNumber] = true;
    }
  };

  Reconciler.initialize();

});