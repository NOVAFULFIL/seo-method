---
title: "Adding markup support for loyalty programs"
source: https://developers.google.com/search/blog/2025/06/loyalty-program
last_updated: 
fetched: 2026-11-19
---

# Adding markup support for loyalty programs

June 10, 2025

![shopping knowledge panel with loyalty price in search results](/static/search/docs/images/loyalty-program.png)

Member benefits, such as lower prices and earning loyalty points, are a major factor considered by shoppers when buying products online. Today we're adding support for defining loyalty programs under [`Organization`](https://developers.google.com/search/docs/appearance/structured-data/organization) structured data combined with loyalty benefits under [`Product`](https://developers.google.com/search/docs/appearance/structured-data/product) structured data.

When you add [loyalty structured data](https://developers.google.com/search/docs/appearance/structured-data/loyalty-program), your business becomes eligible to appear with loyalty benefits on your product search results.

Adding a loyalty program under your Organization structured data is especially important if you don't have a Merchant Center account and want the ability to provide a loyalty program for your business. Merchant Center already lets you provide a [loyalty program](https://support.google.com/merchants/answer/12827255) for your business, so if you have a Merchant Center account we recommend defining your loyalty program there instead.

## Testing with Rich Results Test

After adding a loyalty program to your [`Organization`](https://developers.google.com/search/docs/appearance/structured-data/organization) structured data and loyalty benefits to your [Product](https://developers.google.com/search/docs/appearance/structured-data/product) structured data you can test your markup using the [Rich Results Test](https://search.google.com/test/rich-results) by submitting the URL of a page with loyalty markup or a code snippet. Using the tool, you can confirm whether or not your markup is valid. For example, here is a test for loyalty program markup:

![Loyalty program markup in the Rich Results Test](/static/search/blog/images/loyalty-program-rrt.png)

We hope this addition makes it easier for you to add loyalty programs and benefits for your business, and enable them to be shown across Google shopping experiences. If you have any questions or concerns, please reach out to us in the [Google Search Central Community](https://support.google.com/webmasters/threads?thread_filter=%28category%3Astructured_data%29) or on [LinkedIn](https://www.linkedin.com/showcase/googlesearchcentral/).

Posted by [Irina Tuduce](https://developers.google.com/search/blog/authors/irina-tuduce) and [Pascal Fleury](https://developers.google.com/search/blog/authors/pascal-fleury), Google Shopping software engineers
