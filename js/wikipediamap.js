var RTreeMarkerLayer = L.LayerGroup.extend({
    initialize: function(icon, onClicked) {
        L.LayerGroup.prototype.initialize.call(this);
        this.rtree = rbush();
        //A bit ugly but should fit most use cases
        this.icon = icon;
        this.onClicked = onClicked;
    },
    //rtree_item format: [minx, miny, maxx, maxy, arbitraryData]
    //Here, we use longitude as x axis and latitude as y axis
    //and arbitraryData is just the title string
    bulkInsert: function(rTreeItems) {
        this.rtree.load(rTreeItems);
        return this;
    },
    importTree: function(parsedJSON) {
        this.rtree.fromJSON(parsedJSON);
        return this;
    },
    update: function(bounds) {
        var results = this.rtree.search([bounds.getWest(), bounds.getSouth(),
                                         bounds.getEast(), bounds.getNorth()]);
        this.clearLayers();
        //todo: use a L.marker 'stock' rather than create and destroy each time
        var newMarker;
        for(var i = 0; i < results.length; i++) {
            newMarker = L.marker([results[i][1], results[i][0]],
                                 {title: results[i][4], icon:this.icon});
            newMarker.on('click', this.onClicked);
            this.addLayer(newMarker);
        }
    }
});


//#MAP
var map = L.map('map', {minZoom: 3, zoom: 13, center: [48.8566, 2.3509], zoomControl: false});
new L.Control.Zoom({ position: 'topright' }).addTo(map);

L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', { //https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
    attribution: '&copy; <a href="http://osm.org/copyright" title="OpenStreetMap" target="_blank">OpenStreetMap</a> contributors | Tiles Courtesy of <a href="http://www.mapquest.com/" title="MapQuest" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png" width="16" height="16">',
    subdomains: ['otile1','otile2','otile3','otile4']
}).addTo(map);

var urlParameters = {};
$.each(window.location.search.substring(1).split('&'), function(_, keyval) {
    keyval = keyval.split('=');
    urlParameters[keyval[0]] = keyval[1];
});
console.log(urlParameters.title)
if(urlParameters.title)
    urlParameters.title = decodeURIComponent(urlParameters.title).replace(/\+/g, '_');
else
    urlParameters.title = 'Paris'
urlParameters.language = urlParameters.language || 'en'
$('option[value="' + urlParameters.language + '"]').attr('selected', 'true');


//##LOAD DATA
var layers, layerMap;
$.getJSON('data/' + urlParameters.language + '.json', function(data) {
    var icon = L.divIcon({className: 'point'}),
        onClicked = function(e) { loadArticle(e.target.options.title, true); };

    layerMap = data.layerMap;
    layers = $.map(data.layers, function(points) {
        //too many points for $.map's fluff
        var rTreeItems = [];
        for(var i = 0; i < points.length; i++)
            rTreeItems.push([points[i][1], points[i][0], points[i][1], points[i][0], points[i][2]]);
        return new RTreeMarkerLayer(icon, onClicked).bulkInsert(rTreeItems).addTo(map);
    });

    $('#loading-gear').remove();
    map.panBy([1,1]); //map.trigger('moveend');
});

map.on('zoomend', function() {
    $.each(layers, function(_, l) { l.clearLayers(); });
});
map.on('moveend', function() {
    layers[layerMap[map.getZoom()]].update(map.getBounds());
});


//#WIKIPEDIA
function wikimediaAPI(data, callback) {
    $.ajax({
        url: 'http://' + urlParameters.language + '.wikipedia.org/w/api.php',
        dataType: "jsonp",
        data: data,
        success: callback
    });
}

function loadArticle(name, dontMove) {
    wikimediaAPI(
        {action: 'parse', page: name, mobileformat: 'html', prop: 'text', format: 'json'},
        function(response) {
            $('#content-wrapper').html(response.parse.text['*']).scrollTop(0);
            if($('.redirectMsg').length) loadArticle($('ul.redirectText a').attr('title'));
            urlParameters.title = name;
            window.history.pushState(name, name, 'index.html?' + $.param(urlParameters));
            var geoTag = $('span.geo:first');
            if(geoTag && !(dontMove)) map.panTo(geoTag.text().split('; '));
        }
    );
}


//#PAGE EVENTS
$("#search-input").autoComplete({
    minChars: 1,
    source: function(query, respond) {
        wikimediaAPI(
            {
                'action': "opensearch",
                'format': "json",
                'search': query
            },
            function(data) { respond(data[1]); }
        );
    }
});

$('#content-wrapper').on('click', 'a:not([href^="#"]), area', function(event) {
    event.preventDefault();
    var articleName = $(this).attr('title');//('href').slice(6);
    if(articleName) //link to another article
        loadArticle(articleName);
    else {
        var href = $(this).attr('href');
        if(href.slice(0, 3) != 'http') href = 'http://wikipedia.org' + href;
        window.open(href);
    }
});

$('#language-selection').change(function(_) {
    //ugly but saves a lot of code or use of a plugin
    urlParameters.language = $(this).val();
    window.location.replace('index.html?' + $.param(urlParameters));
});

$('#search-form').submit(function(event) {
    event.preventDefault();
    var searchInput = $('#search-input');
    loadArticle(searchInput.val());
    searchInput.val('');
});


loadArticle(urlParameters.title);


/*
//500 reusable L.Marker objects updated with Wikimedia API.
//Doesn't add much to the table considering RBush's efficiency
WikimediaAPILayer = L.LayerGroup.extend({
    initialize: function(icon, clickCallback) {
        L.LayerGroup.prototype.initialize.call(this);
        var randomMarker;
        for(i = 0; i < 500; i++) {
            randomMarker = L.marker([], {icon: icon, title: ''}).on('click', clickCallback);
            this.addLayer(randomMarker);
        }
        this.layerArray = this.getLayers(); //this._layers is a {id1: layer1, id2: layer2,...} hash
    },
    update: function(center) {
        var gscoord = String(center.lat) + '|' + String(center.lng);
        wikimediaAPI(
            {action: 'query', list: 'geosearch', gsradius: '10000', gslimit: 500, gscoord: gscoord, format: 'json'},
            function(response) {
                points = response.query.geosearch;
                for(i = 0; i < points.length; i++) {
                    this.layers[i].setLatLng([points[i].lat, points[i].lon]);
                    this.layers[i].options.title = points[i].title;
                }
            }
        );
    }
});*/
