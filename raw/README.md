We need the ability to get a list of candidates for a given postcode. Given the data we have access to,
this involves a number of steps:

1. Postcode to ward (OS)
1. Ward (OS) to ward (GSS)
1. Ward (GSS) to constituency (GSS)
1. Constituency (GSS) to constituency (MapIt)
1. Look it up in YourNextMP

Below are the steps to create a lookup table from postcode to constituency (MapIt):

Extract codepoint.zip, cat all ward data
```
unzip -p codepoint.zip *wards.nt > data/wards.nt
```

Extract OS URLs
```
cat data/wards.nt | sed 's#.*id/#http://data.ordnancesurvey.co.uk/doc/#' | sed 's#>\.#.json#' | sort | uniq > data/ward-urls.txt
```

Download the files
```
wget -P data/os -i data/ward-urls.txt -w 0.5
```

Create postcode to ward (OS) lookup
```
echo 'postcode,wardOS' > data/ps2ward-os.csv
cat data/wards.nt | sed 's#.*postcodeunit/##' | sed 's#>.*id/#,#' | sed 's#>\.##' >> data/ps2ward-os.csv
```

Create ward (OS) to ward (GSS) lookup
```
./ward-os2gss.csv data/os/*
```

Get MapIt data
```
wget -O data/mapit-WMC.json http://mapit.mysociety.org/areas/WMC
```

Stitch it all together, you should have:
data/ps2ward-os.csv - postcode to ward (OS)
data/ward-os2gss.csv - ward (OS) to ward (GSS)
data/wards-gss.csv - ward (GSS) and constituency (GSS)
data/mapit-WMC.json - constituencies (MapIt)

```
./stitch.py data/ps2ward-os.csv data/ward-os2gss.csv data/wards-gss.csv data/mapit-WMC.json
```
