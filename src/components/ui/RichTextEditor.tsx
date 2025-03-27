import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
}

/**
 * Composant d'éditeur de texte riche utilisant TinyMCE
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Commencez à écrire...',
  height = 300,
  disabled = false
}) => {
  const editorRef = useRef<any>(null);

  return (
    <Editor
      apiKey="no-api-key" // Vous pouvez obtenir une clé API gratuite sur le site de TinyMCE
      onInit={(evt: any, editor: any) => (editorRef.current = editor)}
      value={value}
      onEditorChange={(newValue: string) => onChange(newValue)}
      init={{
        height,
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | formatselect | ' +
          'bold italic underline | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        placeholder,
        readonly: disabled,
        language: 'fr_FR',
        branding: false
      }}
    />
  );
};

export default RichTextEditor; 