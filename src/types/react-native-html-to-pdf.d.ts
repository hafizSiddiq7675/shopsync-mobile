declare module 'react-native-html-to-pdf' {
  interface Options {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    padding?: number;
    bgColor?: string;
  }

  interface PDF {
    filePath: string;
    base64?: string;
  }

  // Named export (Android compatibility)
  export function convert(options: Options): Promise<PDF>;
  export function generatePDF(options: Options): Promise<PDF>;

  // Default export with convert method (iOS)
  interface RNHTMLtoPDFStatic {
    convert(options: Options): Promise<PDF>;
  }

  const RNHTMLtoPDF: RNHTMLtoPDFStatic;
  export default RNHTMLtoPDF;
}
