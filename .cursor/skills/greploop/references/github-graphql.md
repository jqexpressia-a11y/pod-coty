# GitHub GraphQL — Greploop

## Unresolved review threads (paginated)

Replace `OWNER`, `REPO`, `PR_NUMBER`:

```graphql
query($cursor: String) {
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          comments(first: 3) {
            nodes {
              body
              path
              author { login }
            }
          }
        }
      }
    }
  }
}
```

```powershell
& $gh api graphql -f query='...' -f cursor=$cursor
```

## Resolve one thread

```graphql
mutation {
  resolveReviewThread(input: {threadId: "THREAD_ID"}) {
    thread { isResolved }
  }
}
```

## Greptile issue comments (REST)

Prefer the Greptile comment with the latest `updated_at`:

```powershell
& $gh api --paginate "repos/{owner}/{repo}/issues/$PR_NUMBER/comments?per_page=100" |
  ConvertFrom-Json |
  Where-Object { $_.user.login -match 'greptile' } |
  Sort-Object updated_at -Descending |
  Select-Object -First 1
```
