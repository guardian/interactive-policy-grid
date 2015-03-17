#!/usr/bin/python
import sys, csv

constituencies = {cons['gss']: cons for cons in csv.DictReader(open(sys.argv[1]))}

# NI constituencies don't have a GSS code
wards = {(ward['gss'] or ward['ons_old']): ward for ward in csv.DictReader(open(sys.argv[2]))}

headers = ('postcode', 'ward_gss', 'ward_ons-old', 'ward_name', 'cons_gss',
           'cons_ons-old', 'cons_mapit', 'cons_name')

output = csv.DictWriter(sys.stdout, headers)
output.writeheader()

for row in csv.DictReader(open(sys.argv[3])):
    try:
        postcode = row['pcd'].replace(' ', '')
        ward = wards[row['ward']]
        constituency = constituencies[row['pcon']]

        output.writerow({
            'postcode': postcode,
            'ward_gss': ward['gss'],
            'ward_ons-old': ward['ons_old'],
            'ward_name': ward['name'],
            'cons_gss': constituency['gss'],
            'cons_ons-old': constituency['ons_old'],
            'cons_mapit': constituency['mapit'],
            'cons_name': constituency['name'],
        })
    except:
        print >> sys.stderr, row
