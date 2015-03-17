- `data/constituencies.csv`: a list of constituency GSS codes, old ONS codes and names
- `data/wards.csv`: a list of ward GSS codes, old ONS codes and name (NOTE: Northern Ireland doesn't have GSS codes)
- `data/mapit.json`: a copy of http://mapit.mysociety.org/areas/WMC

## Steps
1. Download and extract https://github.com/theodi/uk-postcodes/blob/master/lib/data/postcodes.zip
2. Run the following:

 ```
 ./extract.py data/constituencies.csv data/wards.csv data/mapit.json <extracted csv> > lookup.csv 2> errors.txt
 ```
