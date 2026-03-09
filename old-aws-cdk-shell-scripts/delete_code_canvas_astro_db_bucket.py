import boto3

s3 = boto3.client('s3')
BUCKET_NAME = 'code-canvas-astro-db'

# Delete all versions
paginator = s3.get_paginator('list_object_versions')
for page in paginator.paginate(Bucket=BUCKET_NAME):
    objects = []
    for v in page.get('Versions', []):
        objects.append({'Key': v['Key'], 'VersionId': v['VersionId']})
    for dm in page.get('DeleteMarkers', []):
        objects.append({'Key': dm['Key'], 'VersionId': dm['VersionId']})
    if objects:
        s3.delete_objects(Bucket=BUCKET_NAME, Delete={'Objects': objects})
        print(f'Deleted {len(objects)} objects/markers')

print('Bucket emptied. Removing bucket...')
s3.delete_bucket(Bucket=BUCKET_NAME)
print('Done! Bucket deleted.')
