interface FontLoaderProps {
  weight?: 'regular' | 'bold' | 'heavy'
  priority?: boolean
}

export function FontLoader({ 
  weight = 'regular',
  priority = false 
}: FontLoaderProps) {
  let fontPath: string;
  
  switch (weight) {
    case 'heavy':
      fontPath = `/fonts/Avenir/Avenir Heavy/Avenir Heavy.ttf`;
      break;
    case 'bold':
      fontPath = `/fonts/Avenir/Avenir Heavy/Avenir Heavy.ttf`;
      break;
    default:
      fontPath = `/fonts/Avenir/Avenir Regular/Avenir Regular.ttf`;
  }
  
  return (
    <link
      rel="preload"
      href={fontPath}
      as="font"
      type="font/ttf"
      crossOrigin="anonymous"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
} 