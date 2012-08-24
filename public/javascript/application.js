/*global $, jQuery, window, document, self, XMLHttpRequest, alert, encodeURIComponent, _gaq */

var Reconciler = Reconciler || { 'settings': {} };

$(function() {

  "use strict";

  Reconciler.vars = {
    pageText       : "",
    identifiedNames : []
  };

  Reconciler.viewer = {};

  Reconciler.initialize = function(obj) {
    this.viewer = obj;
    this.getPageText();
    if(this.settings.gnrd_url) {
       this.getNames();
    }
  };

  Reconciler.getNames = function() {
    var self = this;

    $.ajax({
      type  : 'GET',
      async : true,
      url   : this.settings.gnrd_url,
      dataType : 'jsonp',
      success : function(response) {
        self.buildNames(response);
      },
      error : function(xhr, ajaxOptions, thrownError) {
        if(xhr.status === '404') {
          self.postPageText();
        }
      }
    });
  };

  Reconciler.getPageText = function() {
    var self = this;

    self.viewer.extractText();
    setTimeout(function checkforText() {
      if(self.viewer.pageText[self.viewer.pages.length-1]) {
        self.setPageText(self.viewer.pageText.join());
        if(!self.settings.gnrd_url) {
          self.postPageText();
        }
      } else {
        setTimeout(checkforText, 10);
      }
    }, 10);
  };

  Reconciler.setPageText = function(value) {
    this.vars.pageText = value;
  };

  Reconciler.postPageText = function() {
   var self = this;

   $.ajax({
     type  : 'POST',
     async : true,
     url   : '/reconciler',
     data  : { 'text' : this.vars.pageText, 'token' : self.settings.token },
     dataType : 'json',
     success : function(response) {
       if(response) {
         self.buildNames(response);
       }
     },
     error : function(xhr, ajaxOptions, thrownError) {
       //TODO
     }
   });
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

  Reconciler.highlight = function(obj) {
  var self = this,
      children = $('#' + obj.el.id).find(".textLayer").children().size();

console.log(obj);

/*
 if(children === 0) {
   setTimeout(function checkForText() {
     var textLayer = $('#' + obj.el.id).find(".textLayer");
     if(textLayer.children().size() > 0) {
       textLayer.highlight(self.vars.identifiedNames, { wordsOnly : true });
     } else {
       setTimeout(checkForText, 10);
     }
   }, 10);
 }
    if(!this.vars.identifiedNames) { return; }
    $('#' + obj.el.id.toString()).highlight(this.vars.identifiedNames, { wordsOnly : true });
*/
  };

});