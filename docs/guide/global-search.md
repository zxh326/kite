# Global Search

Kite provides a powerful global search feature that allows you to quickly find any resource in your cluster. You can search by resource name, labels, or annotations.

You can activate the global search via the search bar at the top or by using the shortcut `Ctrl + K` (Windows/Linux) or `Cmd + K` (macOS) on any page.

![Dashboard Overview](/screenshots/global-search.png)

## Features

### Favorites

After clicking the small star on the right side of a resource, you can favorite it. The next time you activate global search, you can quickly find it in the list.

### Search for a specific resource

You can enter the prefix of the resource name followed by a space and the search term you want to input, for example:

```
pod nginx
```

This will only search for Pods whose names start with `nginx`.

`pod` can also be abbreviated as `po`.

More supported resource types and their abbreviations can be found in the code:

https://github.com/zxh326/kite/blob/b16a4701994e32e5251ee21707f940aa312a449d/pkg/utils/search.go#L12-L35

## Limitations

- For performance reasons, the search will not be triggered when the input character length is less than 3.
- Fuzzy search is not supported.
- Does not support cross-cluster search.
- Search will initiate a listAll request to the cluster, so if there are too many resources in the cluster, it may cause the search to slow down. (kite will cache search results for 10 minutes)

## Known Issue

When RBAC rules restrict users from accessing certain resources, these resources still appear in search results.

However, if you try to access these resources, you will receive a permission error.

This is a known issue. It will not be fixed temporarily.

The search interface only returns the names and types of resources, not the specific content.
