---
title: "Robots Refresher: page-level granularity"
source: https://developers.google.com/search/blog/2025/03/robots-refresher-page-level
last_updated: 
fetched: 2026-11-19
---

# Robots Refresher: page-level granularity

Friday, March 14, 2025

With the [robots.txt file](https://developers.google.com/search/docs/crawling-indexing/robots/intro), site owners have a simple way to control which parts of a website are accessible by crawlers. To help site owners further express how search engines and web crawlers can use their pages, the community involved in developing web standards [came up with robots `meta` tags in 1996](https://www.w3.org/Search/9605-Indexing-Workshop/ReportOutcomes/Spidering.txt), just a few months after `meta` tags were proposed for HTML (and anecdotally, also before Google was founded). Later, [`X-Robots-Tag` HTTP response headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Robots-Tag) were added. These instructions are sent together with a URL, so crawlers can only take them into account if they're not disallowed from crawling the URL through the robots.txt file. Together, they form the Robots Exclusion Protocol (REP).

## A look at robots `meta` tags

[Meta tags (or elements)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) are a way to include machine-readable metadata. Robots `meta` tags are one "kind" of `meta` tag, and apply to crawlers, including search engine crawlers. They signal: Is the content blocked from indexing? Should links on the page not be followed for crawling? It's easy to give this information on the page directly with robots `meta` tags.

## A Robots Exclusion Protocol for any URL

To give the same level of control to non-HTML content, the "`X-Robots-Tag`" HTTP response header was created. These [HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) are considered a part of the REP as well. The header supports the same values as the robots `meta` tag, and can be added to any piece of content served online. Besides HTML, Google supports it for content like PDFs, document files, and even images. Most of these file formats don't have a mechanism equivalent to `meta` tags, so a HTTP response header is helpful.

## Getting started with robots `meta` tags and headers

The syntax is simple and extensible. The rules are generally either implemented by the web developer or through a Content Management System (CMS), where site-owners may have checkboxes or drop-down menus to select their preferences. These controls can address a specific crawler, such as Googlebot or, by omitting a specific name, address all crawlers that support these values.

For example, the following rules tell all crawlers not to use the associated page for indexing:

-   In form of an HTML `meta` tag, on a web page:
    
    <meta name="robots" content="noindex">
    
    Looking at existing `meta` tags or response headers is a bit more involved, and requires direct examination of page content or headers. You can view HTML `meta` tags on any page either looking at the page source in your browser, or using Chrome's developer tools to [inspect the page](https://developer.chrome.com/docs/devtools/elements).  
    
-   In form of an [HTTP response header](https://developer.mozilla.org/en-US/docs/Glossary/Response_header):
    
    X-Robots-Tag: noindex
    
    You can check the HTTP response headers for individual URLs with Chrome's developer tools, in the [network panel](https://developer.chrome.com/docs/devtools/network/overview).
    

Other examples of what you can do:

<table class="fixed"><colgroup><col width="50%"> <col></colgroup><tbody><tr><td><p>Don't show a snippet for this page or document.</p></td><td>In HTTP header:<div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a nosnippet X-Robots-Tag header" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">X-Robots-Tag: nosnippet</pre></devsite-code>or in HTML:<div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a nosnippet robots meta tag" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">&lt;meta name="robots" content="nosnippet"&gt;</pre></devsite-code></td></tr><tr><td><p>Don't index this page in <code translate="no" dir="ltr">ExampleBot-News</code>, without specifying a preference for others.</p><p>These controls explicitly specify one crawler.</p></td><td><div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a noindex X-Robots-Tag header for examplebot-news" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">X-Robots-Tag: examplebot-news: noindex</pre></devsite-code>or<div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a noindex robots meta tag for examplebot-news" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">&lt;meta name="examplebot-news" content="noindex"&gt;</pre></devsite-code></td></tr><tr><td><p><code translate="no" dir="ltr">ExampleBot</code> should not show a snippet, and additionally, all crawlers should not follow the links on this page.</p><p>Note that the most restrictive, valid directives apply, so for <code translate="no" dir="ltr">ExampleBot</code> the directive would be combined as "<code translate="no" dir="ltr">nosnippet, nofollow</code>".</p></td><td><div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a nosnippet and nofollow X-Robots-Tag header for examplebot, and a nofollow for all" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">X-Robots-Tag: examplebot: nosnippet
X-Robots-Tag: nofollow</pre></devsite-code>or<div></div><devsite-code><pre class="devsite-click-to-copy" data-label="a nosnippet and nofollow robots meta tag for examplebot, and a nofollow for all" translate="no" dir="ltr" is-upgraded="" syntax="Text only" syntax-guessed="">&lt;meta name="examplebot" content="nosnippet"&gt;
&lt;meta name="robots" content="nofollow"&gt;</pre></devsite-code></td></tr></tbody></table>

## Choosing a REP mechanism

How do you choose which one to use? Fundamentally robots.txt and page-level controls are similar, but not completely interchangeable. Sometimes there's a specific action that's only possible with one of the mechanisms, for example, if it's desired to stop the act of crawling (such as for endless search results pages, possible with robots.txt), if you need a control for an FTP server (possible with robots.txt), or if it's desired not to have a snippet shown for a page (which is only possible with page-level elements). If you don't need to differentiate between blocking crawling and blocking indexing, one approach is to use robots.txt for broader controls (to block large parts of a website), and page-level controls for blocking individual pages.

## Robots Exclusion Protocol—a powerful, living standard

All of these controls are extensible by nature. Over the years, site-owners, crawler operators, and search engines have worked together to evolve them. Historically it started with a handful of values, including `noindex` and `nofollow`, then later on more values like `nosnippet`, `noarchive`, and `max-snippet:` were adopted. And sometimes values are deprecated, as was the case with `noodp`, which used snippets from [DMOZ / Open Directory Project](https://en.wikipedia.org/wiki/DMOZ) before the directory was closed. There's a [plethora of values](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#directives) supported by Google for site owners, and a similar amount from other large crawler operators.

Under the REP umbrella, site owners have control over what is crawled and how the crawled data is used in search engines. They can do this on a broad level for bigger parts of websites, or at a very granular level, for individual pages, even for images within pages. These controls are well-known, available in all common content management systems, broadly supported by commercial operators, and used on billions of hosts on the internet today.

Posted by [John Mueller](https://developers.google.com/search/blog/authors/john-mueller), Search relations team

* * *

## Check out the rest of the Robots Refresher series:
