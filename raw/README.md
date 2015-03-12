We need the ability to get a list of candidates for a given postcode. Given the data we have access to,
this involves a number of steps (brackets indicate type of ID):

1. Postcode to ward (OS)
1. Ward (OS) to ward (GSS)
1. Ward (GSS) to constituency (GSS)
1. Constituency (GSS) to constituency (MapIt)
1. Look up constituency (MapIt) in YourNextMP

## Creating lookup table

Below are the steps to create a lookup table from postcode to constituency (MapIt):

1. Extract codepoint.zip, cat all ward data
 ```
 unzip -p codepoint.zip *wards.nt > data/wards.nt
 ```

1. Extract OS URLs
 ```
 cat data/wards.nt | sed 's#.*id/#http://data.ordnancesurvey.co.uk/doc/#' | sed 's#>\.#.json#' | sort | uniq > data/ward-urls.txt
 ```

1. Download the files
 ```
 wget -P data/os -i data/ward-urls.txt -w 0.5
 ```

1. Create postcode to ward (OS) lookup
 ```
 echo 'postcode,wardOS' > data/ps2ward-os.csv
 cat data/wards.nt | sed 's#.*postcodeunit/##' | sed 's#>.*id/#,#' | sed 's#>\.##' >> data/ps2ward-os.csv
 ```

1. Create ward (OS) to ward (GSS) lookup
 ```
 ./ward-os2gss.py data/os/* > data/ward-os2gss.csv
 ```

1. Get MapIt data
 ```
 wget -O data/mapit-WMC.json http://mapit.mysociety.org/areas/WMC
 ```

1. Stitch it all together

 You should have:
 * `data/ps2ward-os.csv` - postcode to ward (OS)
 * `data/ward-os2gss.csv` - ward (OS) to ward (GSS)
 * `data/wards-gss.csv` - ward (GSS) and constituency (GSS)
 * `data/mapit-WMC.json` - constituencies (MapIt)

 ```
 ./stitch.py data/ps2ward-os.csv data/ward-os2gss.csv data/wards-gss.csv data/mapit-WMC.json
 ```
