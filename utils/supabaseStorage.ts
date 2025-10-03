import { supabase } from '@/supabaseClient'

export const getAudioUrl = async (fileName: string) => {
  try {
    const { data } = await supabase
      .storage
      .from('audio')
      .getPublicUrl(fileName)

    return data.publicUrl
  } catch (error) {
    return null
  }
}

// Test function to check Supabase setup
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .from('audio')
      .list()

    if (error) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
} 

export const listAudioFiles = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .from('audio')
      .list();
    if (error) {
      return [];
    }
    return (data || []).filter((f: any) => f.name.endsWith('.mp3')).map((f: any) => f.name);
  } catch (error) {
    return [];
  }
} 