// src/components/AnnotationSearchBar.jsx
import React, { useState, useRef, useEffect } from "react";
import './AnnotationSearchBar.css';

export default function AnnotationSearchBar({ annotations = [], onResultClick }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [priority, setPriority] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const containerRef = useRef(null);

  // Get all tags for filter dropdown (safe: handle missing tags)
  const allTags = Array.from(
    new Set(annotations.flatMap((a) => (a.tags || [])))
  );

  // Filter annotations (safe: handle missing tags/label)
  const results = annotations.filter((a) => {
    const label = (a.label || "").toString();
    const matchesQuery = !query || label.toLowerCase().includes(query.toLowerCase());
    const matchesTag = !tag || (a.tags || []).includes(tag);
    const matchesPriority = !priority || a.priority === priority;
    return matchesQuery && matchesTag && matchesPriority;
  });

  // compute dropdown top dynamically so it won't overlap the viewer
  const computeDropdownTop = () => {
    try {
      const el = containerRef.current;
      if (!el) return showFilters ? "5.5em" : "3em";
      // place dropdown just below the current container height plus small gap
      return `${el.clientHeight + 8}px`;
    } catch {
      return showFilters ? "5.5em" : "3em";
    }
  };

  // Search handler (show results)
  function handleSearch() {
    setShowResults(true);
  }

  // Enter key triggers search
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  // Hide results when clicking outside
  useEffect(() => {
    if (!showResults) return;

    function onDocMouseDown(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }

    function onEsc(e) {
      if (e.key === "Escape") {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showResults]);

  // Enhance search results styling and make them refresh dynamically
  useEffect(() => {
    // Refresh results dynamically when query, tag, or priority changes

    setShowResults(true);
    if (!query) setShowResults(false);
  }, [query]);

  return (
    <div
      ref={containerRef}
      className="search"
      style={{
        marginBottom: "1em",
        position: "relative",
        maxWidth: '800px',
        zIndex: 9999, // keep the search UI above other content, but not too large
      }}
    >
      <div style={{ display: "flex", flexDirection: 'column', gap: "0.5em", alignItems: "flex-start", width: '100%' }}>
        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
          <input
            className="search-input"
            type="text"
            placeholder="Search annotations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query) setShowResults(true); }}
            onKeyDown={handleKeyDown}

          />
          <button
            className="search-button"
            type="button"
            onClick={handleSearch}
            aria-label="Search annotations"
          >
            <span role="img" aria-label="search" style={{ fontSize: '1.25rem' }}>🔍</span>
          </button>

          <button
            className="filter-button"
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-pressed={showFilters}
            aria-label="Toggle filters"
          >
            {showFilters ? "Hide Filters" : "Filter"}
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.5em', width: '100%' }}>
            <select
              className="filter-select"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              style={{ padding: "0.5em", borderRadius: 6, flex: 1 }}
            >
              <option value="">Tag</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ padding: "0.5em", borderRadius: 6, flex: 1 }}
            >
              <option value="">Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {showResults && (
        <div
          role="listbox"
          aria-label="Search results"
          style={{
            position: "absolute",
            top: computeDropdownTop(),
            left: 0,
            right: 0,
            background: "rgba(30, 41, 59, 0.98)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            zIndex: 10000,
            padding: "0.75em",
            maxHeight: "320px",
            overflowY: "auto",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >


          {results.length === 0 ? (
            <div
              style={{
                color: "#fff",
                textAlign: "center",
                padding: "1rem 0",
                fontStyle: "italic",
                opacity: 0.8,
              }}
            >
              No results
            </div>
          ) : (
            results.map((a) => (
              <div
                key={a.id}
                role="option"
                tabIndex={0}
                style={{
                  padding: "0.75em 1em",
                  marginBottom: "0.6em",
                  background: "#232946",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#2d365f";
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#232946";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)";
                }}
                onClick={() => {
                  setShowResults(false);
                  onResultClick && onResultClick(a);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setShowResults(false);
                    onResultClick && onResultClick(a);
                  }
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
                  {a.label}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.85,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "#93c5fd" }}>
                    Tags: {(a.tags || []).join(", ")}
                  </span>{" "}
                  |{" "}
                  <span style={{ color: "#fbbf24" }}>
                    Priority: {a.priority || "n/a"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
