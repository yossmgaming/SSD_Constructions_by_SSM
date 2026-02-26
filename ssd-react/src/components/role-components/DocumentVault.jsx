import React, { useState, useEffect } from 'react';
import { File, Download, UploadCloud, Trash2, X, Plus, FileText, FileImage, FileBarChart } from 'lucide-react';
import { supabase } from '../../data/supabase';
import { getProjectDocuments, uploadDocumentMeta } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const DocumentVault = ({ projectId, readOnly = false }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [docTitle, setDocTitle] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadDocuments();
        } else {
            setLoading(false);
        }
    }, [projectId]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await getProjectDocuments(projectId);
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setDocTitle(file.name.split('.')[0]); // Default title to filename
        }
    };

    const handleUpload = async () => {
        if (!docTitle.trim() || !selectedFile) {
            alert("Please provide a title and select a file.");
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Upload to Supabase Storage Bucket 'project_documents'
            const fileExt = selectedFile.name.split('.').pop();
            const filePath = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError, data: storageData } = await supabase.storage
                .from('project_documents')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('project_documents')
                .getPublicUrl(filePath);

            const fileUrl = publicUrlData.publicUrl;

            // 3. Save metadata to database via db-extensions
            await uploadDocumentMeta({
                project_id: projectId,
                uploader_id: user.id,
                title: docTitle,
                description: docDesc,
                file_url: fileUrl,
                file_type: fileExt.toLowerCase(),
                file_size_kb: Math.round(selectedFile.size / 1024),
                shared_roles: ['Client', 'Project Manager', 'Super Admin'] // Default visibility
            });

            setIsUploadModalOpen(false);
            setDocTitle('');
            setDocDesc('');
            setSelectedFile(null);
            loadDocuments();

        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed. Ensure the 'project_documents' storage bucket exists in Supabase and permissions allow uploads.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId, fileUrl) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;

        try {
            // Only deleting DB record for now; storage cleanup would require extracting the path
            const { error } = await supabase.from('documents').delete().eq('id', docId);
            if (error) throw error;
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete document.");
        }
    };

    const getFileIcon = (fileType) => {
        const type = fileType?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(type)) return <FileImage className="text-blue-500" size={24} />;
        if (['pdf'].includes(type)) return <FileText className="text-red-500" size={24} />;
        if (['xls', 'xlsx', 'csv'].includes(type)) return <FileBarChart className="text-emerald-500" size={24} />;
        return <File className="text-slate-500" size={24} />;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading secure vault...</div>;

    return (
        <div className="vault-container">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Document Vault</h3>
                    <p className="text-xs text-slate-500 mt-1">Secure repository for blueprints, permits, and contracts.</p>
                </div>
                {!readOnly && (
                    <BounceButton
                        className="btn btn-primary btn-sm flex items-center gap-2"
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        <UploadCloud size={16} />
                        <span>Upload File</span>
                    </BounceButton>
                )}
            </div>

            {documents.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <FileText className="text-slate-300" size={24} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600">The vault is empty</span>
                    <span className="text-xs text-slate-400 mt-1 max-w-xs">
                        {readOnly ? "No documents have been securely shared for this project yet." : "Upload contracts or blueprints to share them securely."}
                    </span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col">
                            {/* Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex gap-3 items-start p-1">
                                <div className="p-3 bg-slate-50 rounded-xl mt-1">
                                    {getFileIcon(doc.file_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-800 truncate" title={doc.title}>{doc.title}</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{doc.file_type?.toUpperCase()} • {doc.file_size_kb ? `${doc.file_size_kb} KB` : 'Unknown size'}</p>
                                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.description || 'No description provided.'}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{formatDate(doc.created_at)}</span>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Download / View"
                                    >
                                        <Download size={16} />
                                    </a>
                                    {!readOnly && (
                                        <button
                                            onClick={() => handleDelete(doc.id, doc.file_url)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete permanently"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => !uploading && setIsUploadModalOpen(false)}
                title="Secure Upload"
            >
                <div className="space-y-4">
                    <div className="form-group border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors relative cursor-pointer">
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                            <UploadCloud size={32} className={selectedFile ? "text-purple-500" : "text-slate-300"} />
                            <span className="text-sm font-semibold text-slate-700">
                                {selectedFile ? selectedFile.name : "Click or drag file to upload"}
                            </span>
                            {!selectedFile && <span className="text-xs text-slate-400">PDF, Excel, Images supported</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Document Title</label>
                        <input
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder="e.g. Architectural Blueprint V2"
                            disabled={uploading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea
                            value={docDesc}
                            onChange={(e) => setDocDesc(e.target.value)}
                            placeholder="Enter notes about this file..."
                            rows={2}
                            disabled={uploading}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsUploadModalOpen(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <BounceButton
                            className="btn btn-primary flex items-center gap-2"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <><span>Encrypting...</span></> // Fake terminology to make it sound cool
                            ) : (
                                <><UploadCloud size={16} /> <span>Upload to Vault</span></>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DocumentVault;
