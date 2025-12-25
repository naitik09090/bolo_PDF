import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Type, Calendar, Trash2, Save, Circle, Edit3, X } from 'lucide-react';
import axios from 'axios';
import crypto from 'crypto-js';

// PDF Signature Engine - સંપૂર્ણ કામ કરતી Application
const PDFSignatureEngine = () => {
    // State Management
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [originalHash, setOriginalHash] = useState('');
    const [signedPdfUrl, setSignedPdfUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [fields, setFields] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [draggedFieldType, setDraggedFieldType] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [currentFieldId, setCurrentFieldId] = useState(null);
    const pdfViewerRef = useRef(null);
    const signatureCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Field Types
    const fieldTypes = [
        { id: 'text', label: 'Text Box', icon: Type, color: '#3b82f6', defaultWidth: 200, defaultHeight: 40 },
        { id: 'signature', label: 'Signature', icon: Edit3, color: '#10b981', defaultWidth: 250, defaultHeight: 80 },
        { id: 'image', label: 'Image Box', icon: Circle, color: '#f59e0b', defaultWidth: 150, defaultHeight: 150 },
        { id: 'date', label: 'Date', icon: Calendar, color: '#8b5cf6', defaultWidth: 150, defaultHeight: 40 },
        { id: 'radio', label: 'Radio', icon: Circle, color: '#ec4899', defaultWidth: 30, defaultHeight: 30 }
    ];

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Signature Canvas Setup
    useEffect(() => {
        if (showSignatureModal && signatureCanvasRef.current) {
            const canvas = signatureCanvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }
    }, [showSignatureModal]);

    // PDF Upload
    const handlePDFUpload = async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfBlob(file);

            // Calculate SHA-256 hash
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const wordArray = crypto.lib.WordArray.create(arrayBuffer);
                const hash = crypto.SHA256(wordArray).toString();
                setOriginalHash(hash);
                console.log('📊 Original PDF Hash:', hash);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('કૃપા કરીને માત્ર PDF file જ select કરો!');
        }
    };

    // Field Drag Start
    const handleFieldDragStart = (e, fieldType) => {
        e.dataTransfer.effectAllowed = 'copy';
        setDraggedFieldType(fieldType);
    };

    // PDF Drop - નવું field ઉમેરો
    const handlePDFDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedFieldType) return;

        const rect = pdfViewerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newField = {
            id: `field_${Date.now()}`,
            type: draggedFieldType.id,
            label: draggedFieldType.label,
            page: 1, // Page number (single page PDF for now)
            x: Math.max(0, x - draggedFieldType.defaultWidth / 2),
            y: Math.max(0, y - draggedFieldType.defaultHeight / 2),
            width: draggedFieldType.defaultWidth,
            height: draggedFieldType.defaultHeight,
            color: draggedFieldType.color,
            value: '',
            imageData: null, // Image અથવા Signature data
        };

        setFields([...fields, newField]);
        setDraggedFieldType(null);

        console.log('✅ Field added:', newField);
    };

    // Field Drag to Move
    const handleFieldDragStart2 = (e, fieldId) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('fieldId', fieldId);
        e.dataTransfer.setData('offsetX', offsetX);
        e.dataTransfer.setData('offsetY', offsetY);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Move Field
    const handleFieldMove = (e) => {
        e.preventDefault();
        const fieldId = e.dataTransfer.getData('fieldId');
        if (!fieldId) return;

        const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
        const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
        const rect = pdfViewerRef.current.getBoundingClientRect();

        const newX = e.clientX - rect.left - offsetX;
        const newY = e.clientY - rect.top - offsetY;

        setFields(fields.map(field =>
            field.id === fieldId
                ? { ...field, x: Math.max(0, newX), y: Math.max(0, newY) }
                : field
        ));
    };

    // Field Click
    const handleFieldClick = (e, fieldId) => {
        e.stopPropagation();
        setSelectedField(fieldId);
    };

    // Delete Field
    const handleDeleteField = () => {
        if (selectedField) {
            setFields(fields.filter(f => f.id !== selectedField));
            setSelectedField(null);
        }
    };

    // Field Value Change
    const handleFieldValueChange = (fieldId, value) => {
        setFields(fields.map(field =>
            field.id === fieldId ? { ...field, value } : field
        ));
    };

    // Open Signature Modal
    const handleOpenSignature = (fieldId) => {
        setCurrentFieldId(fieldId);
        setShowSignatureModal(true);
    };

    // Signature Drawing - Canvas પર draw કરો
    const startDrawing = (e) => {
        const canvas = signatureCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e) => {
        if (!isDrawing) return;

        const canvas = signatureCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Clear Signature
    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Save Signature - Canvas ને image તરીકે save કરો
    const saveSignature = () => {
        const canvas = signatureCanvasRef.current;
        const imageData = canvas.toDataURL('image/png');

        setFields(fields.map(field =>
            field.id === currentFieldId
                ? { ...field, imageData, value: 'Signed' }
                : field
        ));

        setShowSignatureModal(false);
        setCurrentFieldId(null);
        console.log('✅ Signature saved for field:', currentFieldId);
    };

    // Open Image Upload
    const handleOpenImageUpload = (fieldId) => {
        setCurrentFieldId(fieldId);
        setShowImageUpload(true);
    };

    // Upload Image - Image file ને base64 માં convert કરો
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;

                setFields(fields.map(field =>
                    field.id === currentFieldId
                        ? { ...field, imageData, value: file.name }
                        : field
                ));

                setShowImageUpload(false);
                setCurrentFieldId(null);
                console.log('✅ Image uploaded for field:', currentFieldId);
            };
            reader.readAsDataURL(file);
        }
    };

    // Convert CSS coordinates to PDF coordinates
    const convertToPDFCoordinates = (field) => {
        const PDF_WIDTH = 595.28;
        const PDF_HEIGHT = 841.89;

        // Container dimensions (A4 size in pixels)
        const containerWidth = 595;
        const containerHeight = 842;

        const scaleX = PDF_WIDTH / containerWidth;
        const scaleY = PDF_HEIGHT / containerHeight;

        return {
            x: field.x * scaleX,
            y: PDF_HEIGHT - (field.y * scaleY) - (field.height * scaleY),
            width: field.width * scaleX,
            height: field.height * scaleY,
            page: 1
        };
    };

    // Save PDF - MongoDB Backend Integration
    const handleSavePDF = async () => {
        if (!pdfBlob || fields.length === 0) {
            alert('PDF upload કરો અને fields ઉમેરો!');
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append('pdf', pdfBlob);
            formData.append('originalHash', originalHash);

            // Convert all fields to PDF coordinates
            const pdfFields = fields.map(field => ({
                ...field,
                pdfCoordinates: convertToPDFCoordinates(field)
            }));

            formData.append('fields', JSON.stringify(pdfFields));

            console.log('📤 Sending to backend:', {
                fileName: pdfBlob.name,
                fieldsCount: pdfFields.length,
                originalHash: originalHash.substring(0, 16) + '...'
            });

            const response = await axios.post('http://localhost:5000/api/pdf/sign-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setSignedPdfUrl(response.data.signedPdfUrl);
                alert('✅ PDF successfully signed and saved to MongoDB!');
                console.log('✅ Success:', {
                    signedPdfUrl: response.data.signedPdfUrl,
                    auditId: response.data.auditId,
                    originalHash: response.data.originalHash,
                    signedHash: response.data.signedHash
                });
            }
        } catch (error) {
            console.error('Error For MongoDB', error);
            alert('Error For MongoDB connection ');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePDFClick = () => {
        setSelectedField(null);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            {/* હેડર */}
            <div style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>
                        📄 PDF Signature Engine
                    </h1>
                </div>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '1.5rem' }}>

                    {/* સાઇડબાર */}
                    <div>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            {/* PDF Upload */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Upload size={20} />
                                    PDF Upload
                                </h3>

                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2rem 1rem',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: '#f8fafc',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handlePDFUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <Upload size={32} color="#94a3b8" />
                                    <span style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                                        {pdfFile ? pdfFile.name : 'Click to upload PDF'}
                                    </span>
                                </label>

                                {pdfFile && (
                                    <div style={{
                                        marginTop: '0.75rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        color: '#166534'
                                    }}>
                                        ✅ PDF Loaded
                                    </div>
                                )}
                            </div>

                            {/* Draggable Fields */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={20} />
                                    Drag Fields to PDF
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {fieldTypes.map(fieldType => {
                                        const Icon = fieldType.icon;
                                        return (
                                            <div
                                                key={fieldType.id}
                                                draggable
                                                onDragStart={(e) => handleFieldDragStart(e, fieldType)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.875rem',
                                                    backgroundColor: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderLeft: `4px solid ${fieldType.color}`,
                                                    borderRadius: '6px',
                                                    cursor: 'move',
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            >
                                                <Icon size={20} color={fieldType.color} />
                                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                                    {fieldType.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            {selectedField && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                    <button
                                        onClick={handleDeleteField}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Trash2 size={18} />
                                        Delete Field
                                    </button>
                                </div>
                            )}

                            <div style={{ marginTop: '1rem' }}>
                                <button
                                    onClick={handleSavePDF}
                                    disabled={fields.length === 0 || !pdfFile || isSaving}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: fields.length === 0 || !pdfFile || isSaving ? '#cbd5e1' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: fields.length === 0 || !pdfFile || isSaving ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Save size={18} />
                                    {isSaving ? 'Saving...' : `Save PDF (${fields.length})`}
                                </button>

                                {/* Download Link */}
                                {signedPdfUrl && (
                                    <a
                                        href={signedPdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
                                            marginTop: '1rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#dcfce7',
                                            color: '#166534',
                                            textAlign: 'center',
                                            borderRadius: '6px',
                                            textDecoration: 'none',
                                            fontWeight: '500',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        📥 Download Signed PDF
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            minHeight: '600px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                                paddingBottom: '1rem',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                                    PDF Viewer
                                </h3>
                                {/* <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                    {isMobile ? '📱 Mobile' : '🖥️ Desktop'}
                                </span> */}
                            </div>

                            {!pdfFile ? (
                                <div style={{
                                    height: '500px',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8'
                                }}>
                                    <Upload size={48} style={{ marginBottom: '1rem' }} />
                                    <p style={{ margin: 0 }}>કૃપા કરીને PDF upload કરો</p>
                                </div>
                            ) : (
                                <div
                                    ref={pdfViewerRef}
                                    onClick={handlePDFClick}
                                    onDrop={handleFieldMove}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (draggedFieldType) {
                                            handlePDFDrop(e);
                                        }
                                    }}
                                    style={{
                                        position: 'relative',
                                        minHeight: 'auto',
                                        minWidth: 'auto',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        backgroundColor: '#fafafa',
                                        overflow: 'auto',
                                        backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                                    }}
                                >
                                    <div style={{
                                        margin: '2rem auto',
                                        width: isMobile ? '100%' : '595px',
                                        minHeight: '842px',
                                        backgroundColor: 'white',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        padding: '2rem',
                                        position: 'relative'
                                    }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                            Sample Document
                                        </h2>
                                        <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                                            Drag fields from sidebar onto this PDF document.
                                        </p>

                                        {/* Fields */}
                                        {fields.map(field => (
                                            <div
                                                key={field.id}
                                                draggable
                                                onDragStart={(e) => handleFieldDragStart2(e, field.id)}
                                                onClick={(e) => handleFieldClick(e, field.id)}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${field.x}px`,
                                                    top: `${field.y}px`,
                                                    width: `${field.width}px`,
                                                    height: `${field.height}px`,
                                                    backgroundColor: field.imageData ? 'transparent' : `${field.color}15`,
                                                    border: `2px solid ${field.color}`,
                                                    borderRadius: '4px',
                                                    cursor: 'move',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: selectedField === field.id ? `0 0 0 3px ${field.color}40` : 'none',
                                                    zIndex: selectedField === field.id ? 10 : 1,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {field.type === 'text' && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter text..."
                                                        value={field.value}
                                                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                            backgroundColor: 'transparent',
                                                            padding: '0.5rem',
                                                            fontSize: '0.875rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                )}
                                                {field.type === 'date' && (
                                                    <input
                                                        type="date"
                                                        value={field.value}
                                                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                            backgroundColor: 'transparent',
                                                            padding: '0.5rem',
                                                            fontSize: '0.875rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                )}
                                                {field.type === 'signature' && (
                                                    field.imageData ? (
                                                        <img
                                                            src={field.imageData}
                                                            alt="Signature"
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenSignature(field.id);
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                backgroundColor: field.color,
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            ✍️ Sign Here
                                                        </button>
                                                    )
                                                )}
                                                {field.type === 'image' && (
                                                    field.imageData ? (
                                                        <img
                                                            src={field.imageData}
                                                            alt="Uploaded"
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenImageUpload(field.id);
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                backgroundColor: field.color,
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            🖼️ Upload
                                                        </button>
                                                    )
                                                )}
                                                {field.type === 'radio' && (
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        border: `3px solid ${field.color}`,
                                                        backgroundColor: 'white'
                                                    }} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Signature Modal */}
            {showSignatureModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '600px',
                        width: '90%'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                ✍️ Draw Your Signature
                            </h3>
                            <button
                                onClick={() => setShowSignatureModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <canvas
                            ref={signatureCanvasRef}
                            width={500}
                            height={200}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            style={{
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                cursor: 'crosshair',
                                width: '100%',
                                marginBottom: '1rem'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={clearSignature}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                Clear
                            </button>
                            <button
                                onClick={saveSignature}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                Save Signature
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Upload Modal */}
            {showImageUpload && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                                🖼️ Upload Image
                            </h3>
                            <button
                                onClick={() => setShowImageUpload(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFSignatureEngine;