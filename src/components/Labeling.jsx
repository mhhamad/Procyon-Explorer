//src/components/Labeling.jsx
import { useEffect, useRef, useState } from "react";
import "./Labeling.css";

const DEFAULT_COLOR = "#ff3b30";
const DEFAULT_PRIORITY = "medium";

const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_MIN_ZOOM = { low: 0.7, medium: 0.35, high: 0.15 };
const PRIORITY_MIN_OPACITY = { low: 0.125, medium: 0.25, high: 0.7 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const getContrastingTextColor = (hex) => {
    if (!hex) return "#fff";
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 180 ? "#000" : "#fff";
};

// Simple id generator for demo (no external deps)
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const Labeling = ({ osdRef, labelRefs, annotations, setAnnotations }) => {
    const [modal, setModal] = useState({
        open: false,
        type: null,
        id: null,          // <-- use id instead of index
        point: null,
        value: "",
        color: DEFAULT_COLOR,
        priority: DEFAULT_PRIORITY,
        tags: []
    });

    const [tags, setTags] = useState([
        { name: "Galaxy", color: "#ff3b30" },
        { name: "Nebula", color: "#4f46e5" },
        { name: "Star", color: "#f59e0b" }
    ]);
    
    const inputRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        if (modal.open && (modal.type === "new" || modal.type === "edit")) {
            const t = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select && inputRef.current.select();
                }
            }, 0);
            return () => clearTimeout(t);
        }
    }, [modal.open, modal.type]);

    // Boundary check for modal position
    useEffect(() => {
        if (modal.open && modalRef.current && modal.point) {
            const rect = modalRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            //  boundary check
            if (rect.right > viewportWidth) {
                modalRef.current.style.left = 'auto';
                modalRef.current.style.right = '20px';
            }
            if (rect.bottom > viewportHeight) {
                modalRef.current.style.top = 'auto';
                modalRef.current.style.bottom = '20px';
            }
        }
    }, [modal.open, modal.point]);

    useEffect(() => {
        if (!osdRef?.current) return;

        const onDouble = (event) => {
            event.preventDefaultAction = true;
            const webPoint = event.position;
            const viewportPoint = osdRef.current.viewport.pointFromPixel(webPoint);
            const imagePoint = osdRef.current.viewport.viewportToImageCoordinates(viewportPoint);

            setModal({
                open: true,
                type: "new",
                id: null,
                point: { x: imagePoint.x, y: imagePoint.y },
                value: "",
                color: DEFAULT_COLOR,
                priority: DEFAULT_PRIORITY,
                tags: []
            });
        };

        const onZoom = () => {
            const zoom = osdRef.current.viewport.getZoom();
            labelRefs.current.forEach((el) => {
                if (!el) return;

                const priority = el.dataset.priority || DEFAULT_PRIORITY;
                const minZoom = PRIORITY_MIN_ZOOM[priority] ?? PRIORITY_MIN_ZOOM.medium;
                const minOpacity = PRIORITY_MIN_OPACITY[priority] ?? PRIORITY_MIN_OPACITY.medium;
                const maxZoom = 5;

                const t = clamp((zoom - minZoom) / (maxZoom - minZoom), 0, 1);
                const opacity = minOpacity + t * (1 - minOpacity);
                const minScale = 0.5;
                const scale = minScale + t * (1 - minScale);

                el.style.opacity = String(opacity);
                el.style.transform = `scale(${scale})`;
            });
        };

        osdRef.current.addHandler("canvas-double-click", onDouble);
        osdRef.current.addHandler("zoom", onZoom);

        return () => {
            try {
                osdRef.current.removeHandler && osdRef.current.removeHandler("canvas-double-click", onDouble);
                osdRef.current.removeHandler && osdRef.current.removeHandler("zoom", onZoom);
            } catch { }
        };
    }, [osdRef, labelRefs]);

    useEffect(() => {
        if (!osdRef?.current) return;

        labelRefs.current.length = 0;
        osdRef.current.clearOverlays();

        annotations.forEach((ann) => {
            const color = ann.color || DEFAULT_COLOR;
            const priority = ann.priority || DEFAULT_PRIORITY;

            const wrapper = document.createElement("div");
            wrapper.className = "osd-label-wrapper";

            const labelDiv = document.createElement("div");
            labelDiv.className = "osd-label";
            labelDiv.style.background = color;
            labelDiv.style.color = getContrastingTextColor(color);
            labelDiv.style.padding = "6px 14px";
            labelDiv.style.borderRadius = "8px";
            labelDiv.innerText = ann.label || "";
            labelDiv.dataset.priority = priority;

            const menu = document.createElement("div");
            menu.className = "osd-label-menu";
            // create menu items safely
            const editSpan = document.createElement('span'); editSpan.textContent = '✎ Edit';
            const delSpan = document.createElement('span'); delSpan.textContent = '🗑 Delete';
            menu.appendChild(editSpan);
            menu.appendChild(delSpan);

            labelRefs.current.push(labelDiv);
            let hideTimer = null;

            wrapper.onmouseenter = () => {
                clearTimeout(hideTimer);
                menu.style.display = "block";
                menu.style.opacity = "1";
            };
            menu.onmouseenter = () => osdRef.current.setMouseNavEnabled(false);
            menu.onmouseleave = () => osdRef.current.setMouseNavEnabled(true);
            wrapper.onmouseleave = () => {
                hideTimer = setTimeout(() => {
                    menu.style.display = "none";
                }, 700);
                menu.style.opacity = "0";
            };

            // Use stable id for actions
            editSpan.addEventListener("click", (e) => {
                e.stopPropagation();
                setModal({
                    open: true,
                    type: "edit",
                    id: ann.id, // <-- stable identifier
                    point: null,
                    value: ann.label || "",
                    color: ann.color || DEFAULT_COLOR,
                    priority: ann.priority || DEFAULT_PRIORITY,
                    tags: ann.tags || []
                });
            });

            delSpan.addEventListener("click", (e) => {
                e.stopPropagation();
                setModal({
                    open: true,
                    type: "delete",
                    id: ann.id, // <-- stable identifier
                    point: null,
                    value: ann.label || "",
                    color: ann.color || DEFAULT_COLOR,
                    priority: ann.priority || DEFAULT_PRIORITY,
                    tags: ann.tags || []
                });
            });

            wrapper.appendChild(labelDiv);
            wrapper.appendChild(menu);

            osdRef.current.addOverlay({
                element: wrapper,
                location: osdRef.current.viewport.imageToViewportCoordinates(ann.x, ann.y),
                placement: "CENTER",
            });
        });
    }, [annotations, osdRef, labelRefs]);

    const handleConfirm = () => {
        if (modal.type !== 'delete' && !modal.value.trim()) {
            alert("Please enter a label text.");
            return;
        }

        // Always use modal.color for the label color
        const finalColor = modal.color;

        if (modal.type === "new") {
            const now = Date.now();
            const newAnn = {
                id: generateId(),
                x: modal.point.x,
                y: modal.point.y,
                label: modal.value,
                color: finalColor,
                priority: modal.priority,
                tags: modal.tags,
                createdAt: now,
                updatedAt: now
            };
            setAnnotations((prev) => [...prev, newAnn]);
        } else if (modal.type === "edit") {
            const now = Date.now();
            setAnnotations((prev) =>
                prev.map((a) =>
                    a.id === modal.id
                        ? { ...a, label: modal.value, color: finalColor, priority: modal.priority, tags: modal.tags, updatedAt: now }
                        : a
                )
            );
        } else if (modal.type === "delete") {
            setAnnotations((prev) => prev.filter((a) => a.id !== modal.id));
        }
        setModal((m) => ({ ...m, open: false }));
    };

    const handleCancel = () => setModal((m) => ({ ...m, open: false }));



    return (
        <>
            {modal.open && (
                <div className="labeling-modal-overlay" onKeyDown={(e) => e.key === "Escape" && handleCancel()}>
                    <div className="labeling-modal-container" ref={modalRef}>
                        {modal.type === "delete" ? (
                            <>
                                <div className="labeling-modal-header">Delete annotation</div>
                                <div className="labeling-modal-text">
                                    Are you sure you want to delete <strong>{modal.value}</strong>?
                                </div>
                                <div className="labeling-modal-actions">
                                    <button className="labeling-modal-btn labeling-modal-btn-cancel" onClick={handleCancel}>
                                        Cancel
                                    </button>
                                    <button className="labeling-modal-btn labeling-modal-btn-delete" onClick={handleConfirm}>
                                        Delete
                                    </button>
                                </div>
                            </>
                        ) : (
                            <><label className="labeling-modal-header">
                                {modal.type === "new" ? "Create label" : "Edit label"}
                            </label>

                                <input
                                    ref={inputRef}
                                    value={modal.value}
                                    onChange={(e) => setModal((m) => ({ ...m, value: e.target.value }))}
                                    placeholder="Enter label text..."
                                    className="labeling-modal-input"
                                />
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                                    <div className="labeling-modal-color-picker" style={{ width: "50%", marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <label htmlFor="label-color" style={{ fontWeight: 700, color: '#0b74de' }}>Label color:</label>
                                        <input
                                            id="label-color"
                                            type="color"
                                            value={modal.color}
                                            onChange={e => setModal(m => ({ ...m, color: e.target.value }))}
                                            className="label-color-input"
                                            style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    <div className="labeling-modal-priority-simple">
                                        <label>Priority:</label>
                                        <select
                                            value={modal.priority}
                                            onChange={(e) => setModal(m => ({ ...m, priority: e.target.value }))}
                                            className="labeling-modal-select"
                                        >
                                            {PRIORITIES.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="labeling-modal-tags">
                                    <label htmlFor="tag-select">Tags:</label>
                                    <select
                                        id="tag-select"
                                        value="" // always reset to placeholder
                                        onChange={(e) => {
                                            const selectedTag = e.target.value;

                                            if (selectedTag === "__add_tag__") {
                                                const newTagName = prompt("Enter new tag name:");
                                                if (newTagName && newTagName.trim()) {
                                                    // Add to tags list and select it
                                                    setTags(prev => [...prev, { name: newTagName }]);
                                                    setModal(m => ({ ...m, tags: [...m.tags, newTagName] }));
                                                }
                                            } else if (!modal.tags.includes(selectedTag)) {
                                                setModal(m => ({ ...m, tags: [...m.tags, selectedTag] }));
                                            }
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
                                    >
                                        <option value="" disabled>Select a tag...</option>
                                        {tags.map(tag => (
                                            <option key={tag.name} value={tag.name}>{tag.name}</option>
                                        ))}
                                        <option value="__add_tag__">Add new tag…</option>
                                    </select>

                                    {modal.tags.length > 0 && (
                                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {modal.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        background: '#e5e7eb',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem'
                                                    }}
                                                    onClick={() => setModal(m => ({ ...m, tags: m.tags.filter(t => t !== tag) }))}
                                                    title="Click to remove"
                                                >
                                                    {tag} ×
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>


                                <div className="labeling-modal-actions">
                                    <button className="labeling-modal-btn labeling-modal-btn-cancel" onClick={handleCancel}>
                                        Cancel
                                    </button>
                                    <button className="labeling-modal-btn labeling-modal-btn-confirm" onClick={handleConfirm}>
                                        {modal.type === "new" ? "Create" : "Save"}
                                    </button>
                                </div></>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Labeling;
