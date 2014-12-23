#Wikipedia Map
All geotagged Wikipedia articles on a single map (about 600,000 in English) using [Leaflet](https://github.com/Leaflet/Leaflet), [RBush](https://github.com/mourner/rbush) RTree library, and data from [DBPedia](http://dbpedia.org/) [SPARQL endpoint](http://dbpedia.org/sparql) and [dumps](http://wiki.dbpedia.org/Downloads).

Static site ready to use. Data are on DBPedia dumps which seem to only be updated once a year, in June.

MAIN TODO: Find a better way, preferably language-independant, to classify populated places into layers. Classification by single DBPedia area and population tags misses a lot of highly populated plated in English and almost all of them in any other language.
