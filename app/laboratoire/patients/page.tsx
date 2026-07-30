import LaboratoryModule from "../LaboratoryModule";
import ImportButton from "../../components/ImportButton";

export default function LaboratoirePatientsPage() {
  return (
    <>
      <div className="bg-gray-100 px-4 pt-4 md:px-8">
        <ImportButton profile="hafiya.patients" label="Importer des patients" />
      </div>
      <LaboratoryModule mode="patients" />
    </>
  );
}
