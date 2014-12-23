require 'open-uri'
require 'json'

def title(url)
    puts url
    URI.unescape(url.split('/').last).gsub('+', '_')
end

def download_archive(language='en')
    points = {}
    %x(
    curl http://data.dws.informatik.uni-mannheim.de/dbpedia/2014/#{language}/geo_coordinates_#{language}.ttl.bz2 |
    bunzip2 |
    tail -n +2 |
    grep '<http://www.georss.org/georss/point>' |
    tr -d '"<>' |
    cut -d ' ' -f 1,3,4
    ).each_line do |point|
        url, lat, lon = point.split(' ')
        points[title(url.chomp)] = [lat.to_f.round(5), lon.to_f.round(5)]
    end
    points
end

def query(min_pop, min_area, language='en')
    language_prefix = (language == 'en' ? '' : "#{language}.")
    base_url = "http://#{language_prefix}dbpedia.org/sparql?default-graph-uri=&format=text%2Fcsv&timeout=30000&query="
    #using subqueries to bypass endpoint's MaxSortedTopRow limit:
    #http://stackoverflow.com/questions/20937556/how-to-get-all-companies-from-dbpedia
    base_query = <<SPARQL
SELECT DISTINCT ?place WHERE {{
SELECT DISTINCT ?place WHERE
    {
        ?place <http://www.georss.org/georss/point> ?point.
        ?place dbpedia-owl:populationTotal  ?population. FILTER(?population > #{min_pop}). #} UNION
#        { ?place <http://dbpedia.org/ontology/PopulatedPlace/areaTotal> ?area. FILTER(?area > #{min_area}). }
    }
    ORDER BY ASC(?place)
}}
SPARQL
    offset = 0
    results = []
    while(results.length % 10_000 == 0)
        query = base_query + "OFFSET #{offset}\nLIMIT 10000"
        url = base_url + URI.escape(query)

        old_size = results.size
        results += %x(curl '#{url}' | tail -n +2 | tr -d '"').encode("UTF-8").lines
        print results
        break if old_size == results.size #just in case the result count is modulo 10000!

        offset += 10_000
    end
    results.map { |r| title(r.chomp) }
end

%w(en fr es ja).each do |language|
    puts "FETCHING DBPEDIA DUMP"
    points = download_archive(language)
    puts "QUERYING SPARQL ENDPOINT"
    world, continent, state = [[600_000, 30_000 * 10*7],
                               [50_000, 10_000 * 10**7],
                               [1_000, 10**9]].map do |min_pop, min_area|
        query(min_pop, min_area, language).map { |article_title|
            latlon = points.delete(article_title)
            next unless latlon
            [latlon[0], latlon[1], article_title]
        }.compact
    end

    county_or_city = points.map do |article_title, latlon|
        [latlon[0], latlon[1], article_title]
    end


    client_data = {
        format: 'compact',
        layers: [world, continent, state, county_or_city],
        layerMap: [
            0, 0, 0, 0, 0, 0, #1-5
            1, 1, 1,          #6-8
            2, 2, 2,          #9-11
            3, 3, 3, 3, 3, 3, 3, 3, 3  #12-19
        ]
    }

    puts "#{language}: #{world.length}\t#{continent.length}\t#{state.length}\t#{county_or_city.length}"
    File.write("data/#{language}.json", client_data.to_json)
end
