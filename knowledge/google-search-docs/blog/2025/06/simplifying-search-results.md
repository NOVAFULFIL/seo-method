---
title: "Simplifying the search results page"
source: https://developers.google.com/search/blog/2025/06/simplifying-search-results
last_updated: 
fetched: 2026-11-19
---

# Simplifying the search results page

June 12, 2025

As part of our [ongoing efforts](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs) to simplify the Google Search results page, we will be phasing out support for a few [structured data](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) features in Search. We regularly evaluate the usefulness of Search features, both for users and website owners.

We're phasing out these specific structured data types because our analysis shows that they're not commonly used in Search, and we found that these specific displays are no longer providing significant additional value for users. Removing them will help streamline the results page and focus on other experiences that are more useful and widely used.

This update won't affect how pages are ranked. This simplification means that for some results, the specific visual enhancements powered by these lesser-used markups will no longer appear, leading to a more streamlined presentation. The use of these structured data types outside of Google Search (and dependent features) is not affected.

The following structured data types will no longer be supported in Google Search results and will be phased out over the coming weeks and months:

-   [Book Actions](https://developers.google.com/search/docs/appearance/structured-data/book)
-   [Course Info](https://developers.google.com/search/docs/appearance/structured-data/course-info)
-   [Claim Review](https://developers.google.com/search/docs/appearance/structured-data/factcheck)
-   [Estimated Salary](https://developers.google.com/search/docs/appearance/structured-data/estimated-salary)
-   [Learning Video](https://developers.google.com/search/docs/appearance/structured-data/learning-video)
-   [Special Announcement](https://developers.google.com/search/docs/appearance/structured-data/special-announcements)
-   [Vehicle Listing](https://developers.google.com/search/docs/appearance/structured-data/vehicle-listing)

Structured data can be a valuable way for website owners to describe their content and enable helpful Search features. While we're retiring some lesser-used displays, we'll continue to actively support a range of structured data types that users find helpful when evaluating content to visit.

We believe this change contributes to a cleaner, more focused Search results page for everyone. We'll keep looking for ways to simplify the Search results page to provide the best experience for users and website owners, and we'll share updates as we continue this work. If you have any questions or concerns, please reach out to us in the [Google Search Central Community](https://support.google.com/webmasters/threads?thread_filter=%28category%3Astructured_data%29) or on [LinkedIn](https://www.linkedin.com/showcase/googlesearchcentral/).

Posted by Henry Hsu, Product Manager, Google Search

* * *

## Updates

### Update on September 8, 2025

We are removing support in Search Console for the following structured data types, as these types have been phased out from Search results: Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, and Vehicle Listing. Starting on September 9, these types will be removed from Search Console rich result reporting, the Rich Result Test, and the [list of Search appearance filters](https://support.google.com/webmasters/answer/7576553#by_search_appearance&zippy=%2Csearch-appearance) (if applicable for the type). The [Search Console API](https://developers.google.com/webmaster-tools) will continue to support these types through December 2025.

For [bulk data export users](https://support.google.com/webmasters/answer/12918484), keep in mind that the deprecated [search appearance fields](https://support.google.com/webmasters/answer/7576553#by_search_appearance&zippy=%2Csearch-appearance) will be reported as `NULL` by October 1, 2025. If your queries have conditions, you may need to update them.

For example, the following query should be updated, as it doesn't account for the possibility of a deprecated search appearance:

SELECT data\_date, SUM(clicks) FROM \`myproject.searchconsole.searchdata\_url\_impressions\`

WHERE data\_date \> DATE('2025-09-01') AND NOT is\_learning\_videos \-- skips rows **where is\_learning\_videos is NULL**

GROUP BY 1;

Instead, we recommend using the `IS` operator to write future-proof queries that will continue to work even if an appearance becomes `NULL`.

SELECT data\_date, SUM(clicks) FROM \`myproject.searchconsole.searchdata\_url\_impressions\`

WHERE data\_date \> DATE('2025-09-01') AND is\_learning\_videos IS NOT TRUE \-- works whether **is\_learning\_videos is false or NULL**

GROUP BY 1;

For more information, refer to Google Cloud's [BigQuery documentation on the `IS` operator](https://cloud.google.com/bigquery/docs/reference/standard-sql/operators#is_operators).
