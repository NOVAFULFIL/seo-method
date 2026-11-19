---
title: "New filtering and reporting capabilities in the Search Analytics API"
source: https://developers.google.com/search/blog/2026/11/search-analytics-api-update
last_updated: 
fetched: 2026-11-19
---

# New filtering and reporting capabilities in the Search Analytics API

Monday, November 16, 2026

Over the past year, we introduced several updates to the Search Console Performance report to help you better slice and understand your traffic, including the [branded queries filter](https://developers.google.com/search/blog/2025/11/search-console-branded-filter), [web multimodal search reporting](https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc), and [multi-country and multi-device filtering](https://www.linkedin.com/posts/googlesearchcentral_today-were-updating-the-search-console-performance-activity-7513191530648727552-CsMa).

Today, we're bringing all three capabilities to the [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), following ecosystem requests to make this data available for custom reporting and automated workflows.

## How these updates help website owners and developers

These API features make it easier for site owners, international businesses, and third-party tool builders to automate reporting at scale. Instead of stitching together separate requests or maintaining complex keyword regex lists, you can now query a group of countries (such as EMEA, LATAM, or DACH) and device combinations in a single API call, and automatically segment branded from non-branded traffic in your dashboards.

You can also pipe search metrics directly into your dashboards and monitoring workflows to track multimodal performance alongside other Google Search results. Because these filters work together, you can slice your data even further, such as monitoring brand growth across specific regional hubs or seeing which pages perform best in multimodal search across key markets and devices.

## How to pull the new data from the Search Analytics API

We've added three new options to the [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query):

-   **Branded queries**: Group or filter your data by `brandedClassification` to compare branded and non-branded performance. As in Search Console, this data is only available for [eligible properties](https://developers.google.com/search/blog/2025/11/search-console-branded-filter#rollout-and-availability). For other properties, the response won't include any rows.
-   **Web multimodal**: Set `type` to `webMultimodal` to get performance data from Google Lens, Circle to Search on Android, and image uploads in Google Search. This data will also be available in BigQuery for properties with an active [bulk data export](https://support.google.com/webmasters/answer/12917675).
-   **Multi-country and multi-device filters**: Use the new `filterLists` field to filter by several countries or devices in a single request.

For the full details, including supported values and combinations, see the [Search Analytics API documentation](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

We hope these additions make it easier to automate your search performance reporting. If you have any questions or feedback, please reach out to us on [LinkedIn](https://www.linkedin.com/showcase/googlesearchcentral/) or post in the [Google Search Central Community](https://support.google.com/webmasters/threads?thread_filter=%28category%3Asearch_console%29).

Posted by [Daniel Waisberg](https://developers.google.com/search/blog/authors/daniel-waisberg), [Nati Yosephian](https://developers.google.com/search/blog/authors/nati-yosephian), [Karin Gadasi](https://developers.google.com/search/blog/authors/karin-gadasi), Search Console team.
