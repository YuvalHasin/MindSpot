import Navbar from "../components/patient/Navbar";
import Hero from "../components/patient/Hero";
import HowItWorks from "../components/patient/HowItWorks";
import Services from "../components/patient/Services";
import Therapists from "../components/patient/Therapists";
import Footer from "../components/patient/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Services />
      <Therapists />
      <Footer />
    </div>
  );
};

export default Index;
