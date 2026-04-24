# Graph Report - .  (2026-04-21)

## Corpus Check
- Corpus is ~19,109 words - fits in a single context window. You may not need a graph.

## Summary
- 156 nodes · 159 edges · 39 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Query Highlighting Engine|Query Highlighting Engine]]
- [[_COMMUNITY_Log Timestamp Parsing|Log Timestamp Parsing]]
- [[_COMMUNITY_API Client Proxy|API Client Proxy]]
- [[_COMMUNITY_Settings Panel UI|Settings Panel UI]]
- [[_COMMUNITY_Data Formatters|Data Formatters]]
- [[_COMMUNITY_Field Item Component|Field Item Component]]
- [[_COMMUNITY_Virtual List|Virtual List]]
- [[_COMMUNITY_Fields Store|Fields Store]]
- [[_COMMUNITY_Query Builder|Query Builder]]
- [[_COMMUNITY_Saved Views Panel|Saved Views Panel]]
- [[_COMMUNITY_Query Validation|Query Validation]]
- [[_COMMUNITY_Time Utilities|Time Utilities]]
- [[_COMMUNITY_Query Editor|Query Editor]]
- [[_COMMUNITY_Fields API|Fields API]]
- [[_COMMUNITY_Logs API|Logs API]]
- [[_COMMUNITY_Settings Store|Settings Store]]
- [[_COMMUNITY_Search Orchestration|Search Orchestration]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Logs Store|Logs Store]]
- [[_COMMUNITY_App Entry|App Entry]]
- [[_COMMUNITY_Redaction|Redaction]]
- [[_COMMUNITY_Permissions|Permissions]]
- [[_COMMUNITY_Live Tail Panel|Live Tail Panel]]
- [[_COMMUNITY_Log Detail|Log Detail]]
- [[_COMMUNITY_Hits Histogram|Hits Histogram]]
- [[_COMMUNITY_App Config|App Config]]
- [[_COMMUNITY_Security Config|Security Config]]
- [[_COMMUNITY_Proxy Config|Proxy Config]]
- [[_COMMUNITY_Storage Keys|Storage Keys]]
- [[_COMMUNITY_UI Config|UI Config]]
- [[_COMMUNITY_Query Store|Query Store]]
- [[_COMMUNITY_Audit Panel|Audit Panel]]
- [[_COMMUNITY_Filter Bar|Filter Bar]]
- [[_COMMUNITY_Log Table|Log Table]]
- [[_COMMUNITY_Time Range Picker|Time Range Picker]]
- [[_COMMUNITY_Activity Drawer|Activity Drawer]]
- [[_COMMUNITY_Highlighted Text|Highlighted Text]]
- [[_COMMUNITY_Field Sidebar|Field Sidebar]]
- [[_COMMUNITY_Log Context Modal|Log Context Modal]]

## God Nodes (most connected - your core abstractions)
1. `extractLogMessageTime()` - 6 edges
2. `extractHighlightTerms()` - 5 edges
3. `parseJavaBracketTime()` - 4 edges
4. `parseNginxTime()` - 4 edges
5. `calculateDynamicVirtualWindow()` - 4 edges
6. `loadValues()` - 4 edges
7. `normalizeProxyTarget()` - 4 edges
8. `isAllowedProxyTarget()` - 4 edges
9. `getTargetUrl()` - 4 edges
10. `validateQuery()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Query Highlighting Engine"
Cohesion: 0.22
Nodes (12): buildHighlightedParts(), collectPatternMatches(), decodePhrase(), extractHighlightTerms(), extractInValues(), extractRegexTerms(), extractResidualTerms(), getHighlightPhrase() (+4 more)

### Community 1 - "Log Timestamp Parsing"
Cohesion: 0.33
Nodes (11): extractLogMessageTime(), formatLogTimestamp(), getLogDisplayTimestamp(), getLogTimeTitle(), normalizeIsoCandidate(), normalizeMillis(), parseIsoTime(), parseJavaBracketTime() (+3 more)

### Community 2 - "API Client Proxy"
Cohesion: 0.27
Nodes (7): getApiBaseUrl(), getAuth(), getAuthCredentials(), getTargetUrl(), isAllowedProxyTarget(), normalizeProxyTarget(), setApiBaseUrl()

### Community 3 - "Settings Panel UI"
Cohesion: 0.18
Nodes (0): 

### Community 4 - "Data Formatters"
Cohesion: 0.25
Nodes (0): 

### Community 5 - "Field Item Component"
Cohesion: 0.36
Nodes (4): loadExpandedValuesIfReady(), loadValues(), retryLoad(), toggleExpand()

### Community 6 - "Virtual List"
Cohesion: 0.52
Nodes (5): buildPrefixOffsets(), calculateDynamicVirtualWindow(), findFirstPrefixAtOrAbove(), findItemIndexAtOffset(), sanitizeHeight()

### Community 7 - "Fields Store"
Cohesion: 0.33
Nodes (0): 

### Community 8 - "Query Builder"
Cohesion: 0.47
Nodes (3): buildLogsQL(), isLogsQLSyntax(), quoteIfNeeded()

### Community 9 - "Saved Views Panel"
Cohesion: 0.4
Nodes (2): buildDefaultViewName(), saveCurrentView()

### Community 10 - "Query Validation"
Cohesion: 0.6
Nodes (3): hasBalancedBraces(), hasBalancedQuotes(), validateQuery()

### Community 11 - "Time Utilities"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Query Editor"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "Fields API"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Logs API"
Cohesion: 0.5
Nodes (2): parseNdjsonChunk(), queryLogs()

### Community 15 - "Settings Store"
Cohesion: 0.67
Nodes (2): buildDefaultApiList(), sanitizeApiList()

### Community 16 - "Search Orchestration"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Vite Config"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Logs Store"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "App Entry"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Redaction"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Permissions"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Live Tail Panel"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Log Detail"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Hits Histogram"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "App Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Security Config"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Proxy Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Storage Keys"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "UI Config"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Query Store"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Audit Panel"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Filter Bar"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Log Table"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Time Range Picker"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Activity Drawer"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Highlighted Text"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Field Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Log Context Modal"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `App Entry`** (2 nodes): `App.vue`, `main.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Redaction`** (2 nodes): `redactSensitiveFields()`, `redaction.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Permissions`** (2 nodes): `canViewField()`, `permissions.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Live Tail Panel`** (2 nodes): `setLive()`, `LiveTailPanel.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Log Detail`** (2 nodes): `order()`, `LogDetail.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hits Histogram`** (2 nodes): `if()`, `HitsHistogram.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Config`** (1 nodes): `appConfig.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Security Config`** (1 nodes): `securityConfig.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Proxy Config`** (1 nodes): `proxyConfig.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Storage Keys`** (1 nodes): `storageKeys.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Config`** (1 nodes): `uiConfig.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Query Store`** (1 nodes): `query.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Panel`** (1 nodes): `AuditPanel.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filter Bar`** (1 nodes): `FilterBar.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Log Table`** (1 nodes): `LogTable.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Time Range Picker`** (1 nodes): `TimeRangePicker.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Activity Drawer`** (1 nodes): `ActivityDrawer.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Highlighted Text`** (1 nodes): `HighlightedText.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Field Sidebar`** (1 nodes): `FieldSidebar.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Log Context Modal`** (1 nodes): `LogContextModal.vue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._