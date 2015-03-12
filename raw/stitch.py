#!/usr/bin/python
import sys, csv, json

ward_os2gss = {ward['wardOS']: ward['wardGSS'] for ward in csv.DictReader(open(sys.argv[2]))}
wards_gss = {ward['WD12CD']: ward for ward in csv.DictReader(open(sys.argv[3]))}

cons_gss2mapit = {cons['codes']['gss']: mapit_id for mapit_id, cons in json.load(open(sys.argv[4])).iteritems()}

headers = ('postcode', 'wardOS', 'WD12CD','WD12CDO','WD12NM','consMapIt', 'PCON12CD','PCON12CDO','PCON12NM')
writer = csv.DictWriter(sys.stdout, headers)
writer.writeheader()

for row in csv.DictReader(open(sys.argv[1])):
    ward_gss = ward_os2gss[row['wardOS']]
    ward = wards_gss[ward_gss]

    row['consMapIt'] = cons_gss2mapit[ward['PCON12CD']]
    row.update(ward)
    writer.writerow(row)
