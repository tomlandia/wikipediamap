#Wikipedia Map
All geotagged Wikipedia articles on a single map (about 600,000 in English) using [Leaflet](https://github.com/Leaflet/Leaflet), [RBush](https://github.com/mourner/rbush) RTree library, and data from [DBPedia](http://dbpedia.org/) [SPARQL endpoint](http://dbpedia.org/sparql) and [dumps](http://wiki.dbpedia.org/Downloads).

Static site ready to use. Data are on DBPedia dumps which seem to only be updated once a year, in June.

TODO:

- Find other sources such as a geolocation services towns, counties and provinces
- Maybe show two layers at a time?
- Actual multilingual support
- Add a splash screen and use MessagePack/Protobuf if worth it on slow connections
