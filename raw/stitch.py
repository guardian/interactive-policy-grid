#!/usr/bin/python
import sys, csv

ward_os2gss = {ward['wardOS']: ward['wardGSS'] for ward in csv.DictReader(open(sys.argv[2]))}
wards_gss = {ward['WD12CD']: ward for ward in csv.DictReader(open(sys.argv[3]))}

headers = ('postcode', 'wardOS', 'WD12CD','WD12CDO','WD12NM','PCON12CD','PCON12CDO','PCON12NM')
writer = csv.DictWriter(sys.stdout, headers)
writer.writeheader()

for row in csv.DictReader(open(sys.argv[1])):
    ward_gss = ward_os2gss[row['wardOS']]
    ward = wards_gss[ward_gss]

    row.update(ward)
    writer.writerow(row)
