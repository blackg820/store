# Known API Gaps

- Product title/description translation columns are absent by intentional schema migration. Owner-entered product text is canonical.
- The existing web product flow does not implement product duplication or bulk actions; matching API endpoints were not added.
- Thumbnail URL is exposed in the media contract but thumbnail generation is not implemented yet.
- Image dimensions are captured for image uploads. Video width/height probing is not implemented.
- Storage quota checking occurs before upload but is not a transactional reservation, so concurrent large uploads can briefly race.
- Full automated test execution still requires SQLite PDO or a configured test database in this runtime.
