import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Poppins } from "next/font/google";
import "./globals.css";
import { getPreference } from "@/server/server-actions";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

const geistSans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Próximo Vest",
  description:
    "Uma plataforma completa para preparação e sucesso em vestibulares. Oferecemos simulados, cursos preparatórios, dicas de estudo e uma comunidade ativa para ajudar você a alcançar seus objetivos acadêmicos.",
  keywords: [
    "Próximo Vest",
    "Plataforma de Vestibulares",
    "Enem",
    "Fuvest",
    "Vestibulares 2024",
    "Preparação para Vestibular",
    "Simulados Online",
    "Cursos Preparatórios",
    "Aprovação em Vestibulares",
    "Estudos para o Enem",
    "Dicas de Estudo",
    "Material Didático",
    "Videoaulas Gratuitas",
    "Redação para Vestibular",
    "Calendário de Vestibulares",
    "Notícias sobre Educação",
    "Fórum de Estudantes",
    "Comunidade de Vestibulandos",
    "Mentoria Educacional",
    "Técnicas de Estudo",
    "Planejamento de Estudos",
    "Recursos Educacionais",
    "Aulas Particulares Online",
    "Grupos de Estudo",
    "Desempenho Acadêmico",
    "Simulados Enem",
    "Simulados Fuvest",
    "Questões de Vestibular",
    "Resolução de Exercícios",
    "Mapas Mentais para Estudo",
    "Flashcards Educacionais",
    "Aplicativo de Estudos",
    "Blog Educacional",
    "Resultados de Vestibulares"
  ],
  openGraph: {
    type: "website",
    siteName: "Próximo Vest",
    locale: "pt-BR",
    url: "proximovest.com.br",
    title: "Próximo Vest",
    description:
      "Uma plataforma completa para preparação e sucesso em vestibulares. Oferecemos simulados, cursos preparatórios, dicas de estudo e uma comunidade ativa para ajudar você a alcançar seus objetivos acadêmicos.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Próximo Vest",
      },
    ],
  },
  authors: [
    {
      name: "Enrico Marques",
    },
  ],
  creator: "Enrico Marques",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/favicon-32x32.png",
      sizes: "32x32",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/favicon-16x16.png",
      sizes: "16x16",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/android-chrome-192x192.png",
      sizes: "192x192",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/android-chrome-512x512.png",
      sizes: "512x512",
    },
  ],
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const themeMode = await getPreference<ThemeMode>("theme_mode", THEME_MODE_VALUES, "light");
  const themePreset = await getPreference<ThemePreset>("theme_preset", THEME_PRESET_VALUES, "default");
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset}>
              {children}
              <Toaster />
            </PreferencesStoreProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}