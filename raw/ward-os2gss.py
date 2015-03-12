#!/usr/bin/python
import sys, json, csv, os

writer = csv.writer(sys.stdout)
writer.writerow(('wardOS', 'wardGSS'))

for fn in sys.argv[1:]:
    data = json.load(open(fn))

    os_code = os.path.splitext(os.path.basename(fn))[0]
    ward_data = data['http://data.ordnancesurvey.co.uk/id/%s' % os_code]
    gss_code = ward_data['http://data.ordnancesurvey.co.uk/ontology/admingeo/gssCode']
    if len(gss_code) != 1:
        print >> sys.stderr, 'Multiple GSS codes for', os_code
    else:
        writer.writerow((os_code, gss_code[0]['value']))

