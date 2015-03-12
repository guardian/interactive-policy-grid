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

Stitch it all together, you should have:
data/ps2ward-os.csv - postcode to ward (OS)
data/ward-os2gss.csv - ward (OS) to ward (GSS)
data/wards-gss.csv - ward (GSS) and constituency (GSS)

```
./stitch.py data/ps2ward-os.csv data/ward-os2gss.csv data/wards-gss.csv
```
