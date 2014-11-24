/*** Global object that contains the app ***/
var app = app || {};

// keep our map stuff in a part of the app object as to not pollute the global name space
app.map = (function(w,d, $, _){

  /*** local variables for map parts and layers ***/
  var el = {
    map : null,
    cdbURL : null,
    styles: null,
    sql : null,
    tonerLite : null,
    satellite : null,
    taxLots : null,
    dobPermits : null,
    dobPermitsA1 : null,
    dobPermitsA2A3 : null,
    dobPermitsNB : null,
    geocoder : null,
    geocoderMarker : null
  };

  // reference cartocss styles from mapStyles.js
  el.styles = app.mapStyles;
  // url to cartodb bushwick community map viz json
  el.cdbURL = "http://bushwick.cartodb.com/api/v2/viz/64ceb582-71e2-11e4-b052-0e018d66dc29/viz.json";

  // queries for map pluto tax lots
  // sent to cartodb when layer buttons clicked
  el.sql = {
    all : "SELECT * FROM bushwick_pluto14v1",
    rentStab : "SELECT * FROM bushwick_pluto14v1 WHERE yearbuilt < 1974 AND unitsres > 6",
    vacant : "SELECT * FROM bushwick_pluto14v1 WHERE landuse = '11'",
  };

  el.geocoder = new google.maps.Geocoder();
                                                                           
  // set up the map
  var initMap = function() {
    // map paramaters
    var params = {
      center : [40.6941, -73.9162],
      minZoom : 14,
      maxZoom : 20,
      zoom : 15,
      maxBounds : L.latLngBounds([40.670809,-73.952579],[40.713565,-73.870354]),
      zoomControl : false
    }

    // instantiate the Leaflet map
    el.map = L.map('map', params);
    // stamen toner lite base layer
    el.tonerLite = new L.StamenTileLayer('toner-lite');
    el.map.addLayer(el.tonerLite);
    // add the tax lot layer from cartodb
    getCDBData(params);
  } 

  // function to load map pluto tax lot layer and dob permit layer 
  // from CartoDB 
  var getCDBData = function(mapOptions) {  
    cartodb.createLayer(el.map, el.cdbURL, {
        cartodb_logo: false, 
        legends: false
      }, 
      function(layer) {
        // store the map pluto tax lot sublayer
        layer.getSubLayer(0).setCartoCSS(el.styles.regular);
        layer.getSubLayer(0).setSQL(el.sql.all);
        el.taxLots = layer.getSubLayer(0);

        // store the dob permits a1 sublayer
        el.dobPermitsA1 = layer.createSubLayer({
          sql : "SELECT * FROM exp_codedjobs_a1",
          cartocss : '#exp_codedjobs_a1 {marker-width: 7; marker-fill: hsl(0,0%,35%); marker-line-color: white; marker-line-width: 0;}',
          interactivity: ['address']
        });

        // store the dob permits a2a3 sublayer
        el.dobPermitsA2A3 = layer.createSubLayer({
          sql : "SELECT * FROM exp_codedjobs_a2a3",
          cartocss : '#exp_codedjobs_a1 {marker-width: 7; marker-fill: hsl(100,0%,60%); marker-line-color: white; marker-line-width: 0;}',
          interactivity: 'address'
        });

        // store the dob permits nb sublayer
        el.dobPermitsNB = layer.createSubLayer({
          sql : "SELECT * FROM exp_codedjobs_nb",
          cartocss : '#exp_codedjobs_a1 {marker-width: 7; marker-fill: hsl(350,0%,10%); marker-line-color: white; marker-line-width: 0;}',
          interactivity: 'address'
        });

        var event = function(e){
              $('#tool-tip').css({
                 left:  e.pageX,
                 top:   e.pageY
              });
          };

        el.dobPermitsA1.infowindow.set({
          'template' : $('#infowindow_template').html()
        })
          .on('error', function(err){
            console.log('infowindow error: ', err);
          });                                 

        // hide sublayers for dob permits
        var num_sublayers = layer.getSubLayerCount();
        for (var i = 1; i < num_sublayers; i++) { 
          //console.log('sublayers: ', layer.getSubLayer(i)); 
          layer.getSubLayer(i).setInteraction(true);          
          // layer.getSubLayer(i).infowindow.set({
          //   'template' : $('#infowindow_template').html()
          // })
          //   .on('error', function(err){
          //     console.log('infowindow error: ', err);
          //   });
          
          layer.getSubLayer(i).on('featureOver', function(e,pos,latlng,data){
            $('#tool-tip').html('<p>'  + data.address + '</p>');
            $(document).bind('mousemove', event);
            $('#tool-tip').show();
          });

          layer.getSubLayer(i).on('featureOut', function(e,pos,latlng,data){
           //Make the tooltip go away when off cities
            $('#tool-tip').hide();
            $(document).unbind('mousemove', event, false);
          });

          layer.getSubLayer(i).hide();

        }

      }).addTo(el.map);    
  };

  // change the cartoCSS of a layer
  var changeCartoCSS = function(layer, css) {
    layer.setCartoCSS(css);
  };

  // change SQL query of a layer
  var changeSQL = function(layer, sql) {
    layer.setSQL(sql);
  }

  // corresponding cartoCSS changes to tax lot layer buttons
  var taxLotActions = {
    regular : function() {
      changeCartoCSS(el.taxLots, el.styles.regular);
      changeSQL(el.taxLots, el.sql.all);
      return true;
    },
    zoning : function() {
      changeCartoCSS(el.taxLots, el.styles.zoning);
      changeSQL(el.taxLots, el.sql.all);
      return true;
    },
    availfar : function() {
      changeCartoCSS(el.taxLots, el.styles.availFAR);
      changeSQL(el.taxLots, el.sql.all);
      return true;
    },
    rentstab : function() {
      changeCartoCSS(el.taxLots, el.styles.red);
      changeSQL(el.taxLots, el.sql.rentStab);
      return true;
    },
    vacant : function() {
      changeCartoCSS(el.taxLots, el.styles.red);
      changeSQL(el.taxLots, el.sql.vacant);
    }
  };

  // add tax lot layer button event listeners
  var initButtons = function() {
    $('.button').click(function() {
      $('.button').removeClass('selected');
      $(this).addClass('selected');
      taxLotActions[$(this).attr('id')]();
    }); 
  }

  // change dob permit layer sql based on check box boolean
  var initCheckboxes = function() {
    // checkboxes for dob permit layer
    var checkboxDOB = $('input.dob:checkbox'),
          $a1 = $('#a1'),
          $a2a3 = $('#a2a3'),
          $nb = $('#nb');

    // toggle A1 major alterations layer
    $a1.change(function(){
      if ($a1.is(':checked')){
        el.dobPermitsA1.show();
        // el.dobPermitsA1.setInteraction(true);
        el.dobPermitsA1.setInteractivity('address');
      } else {
        el.dobPermitsA1.hide();
      };
    });

    // toggle A2, A3 minor alterations layer
    $a2a3.change(function(){
      if ($a2a3.is(':checked')){
        el.dobPermitsA2A3.show();
        // el.dobPermitsA2A3.setInteraction(true);
        //el.dobPermitsA2A3.setInteractivity('address, job, initialcos, jt_description, ownerphone, ownername, ownertype');
      } else {
        el.dobPermitsA2A3.hide();
      };
    });    

    // toggle NB new buildings layer
    $nb.change(function(){
      if ($nb.is(':checked')){
        el.dobPermitsNB.show();
        // el.dobPermitsNB.setInteraction(true);
        // el.dobPermitsNB.setInteractivity('address, job, initialcos, jt_description, ownerphone, ownername, ownertype'); 
      } else {
        el.dobPermitsNB.hide();
      };
    });        
  }

  // geocode search box text and create a marker on the map
  var geocode = function(address) {
    // bounding box for nyc to improve geocoder results
    // 40.678685,-73.942451,40.710247,-73.890266
    var bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(40.678685,-73.942451), //sw
          new google.maps.LatLng(40.710247,-73.890266) //ne
          );    
      el.geocoder.geocode({ 'address': address, 'bounds' : bounds }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          var latlng = [results[0].geometry.location.k , results[0].geometry.location.B];
          console.log('gecoder results: ', results);
          // console.log('latlng: ', latlng);
          
          // remove geocoded marker if one already exists
          if (el.geocoderMarker) { 
            el.map.removeLayer(el.geocoderMarker);
          }
          // add a marker and pan and zoom the map to it
          el.geocoderMarker = new L.marker(latlng).addTo(el.map);
          el.geocoderMarker.bindPopup("<h4>" + results[0].formatted_address + "</h4>" ).openPopup();
          el.map.setView(latlng, 20);
          };
      });
  }

  // search box interaction
  var searchAddress = function() {
    $('#search-box').focus(function(){
      if ($(this).val()==="Search for a Bushwick address") {
        $(this).val("");
      }
    });
    $('#search-box').on('blur',function(){
      // console.log($(this).val());
      if ($(this).val()!=="") {
        $address = $(this).val()
        geocode($address);  
        $(this).val("");
      } 
    });
  }

  // set up custom zoom buttons
  var initZoomButtons = function(){
    $('#zoom-in').on('click', function(){
      el.map.zoomIn();
    });
    $('#zoom-out').on('click', function(){
      el.map.zoomOut();
    });
  }

  // get it going!
  var init = function() {
    initMap();
    initButtons();
    initCheckboxes();
    searchAddress();
    initZoomButtons();
  }

  // only return init() and the stuff in the el object
  return {
    init : init,
    el : el
  }

})(window, document, jQuery, _);

// call app.map.init() once the dom is loaded
window.addEventListener('DOMContentLoaded', function(){
  app.map.init();
  timerangeUI();
});