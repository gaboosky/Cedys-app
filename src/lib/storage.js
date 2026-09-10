import { supabase } from './supabase';

export async function subirImagen(file, carpeta) {
  const extension = file.name.split('.').pop();
  const nombreArchivo = `${carpeta}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from('fotos')
    .upload(nombreArchivo, file);
  if (error) throw error;

  const { data } = supabase.storage.from('fotos').getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
