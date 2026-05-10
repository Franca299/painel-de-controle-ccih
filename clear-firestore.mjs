/**
 * clear-firestore.mjs
 * Deleta TODOS os documentos da coleção "culturas" no Firestore.
 * Executar uma vez antes do primeiro upload real.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6MfA_M-IX_WlNadE2opLxTRqmja4Qdeg",
  authDomain: "gestao-microbiologica-85fa6.firebaseapp.com",
  projectId: "gestao-microbiologica-85fa6",
  storageBucket: "gestao-microbiologica-85fa6.firebasestorage.app",
  messagingSenderId: "438229047686",
  appId: "1:438229047686:web:0f7b84b2cd4c66ce15f407",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(colName) {
  console.log(`🔍 Buscando documentos em "${colName}"...`);
  const snap = await getDocs(collection(db, colName));

  if (snap.empty) {
    console.log(`✅ Coleção "${colName}" já está vazia. Nada a deletar.`);
    return;
  }

  console.log(`🗑️  Deletando ${snap.size} documentos...`);
  const deletions = snap.docs.map(d => {
    console.log(`   - ${d.id}`);
    return deleteDoc(doc(db, colName, d.id));
  });

  await Promise.all(deletions);
  console.log(`\n✅ ${snap.size} documentos deletados com sucesso da coleção "${colName}".`);
  console.log(`   O Firestore está limpo e pronto para o primeiro upload real.`);
}

clearCollection('culturas')
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  })
  .finally(() => {
    // força o processo a terminar (Firebase SDK mantém conexão aberta)
    setTimeout(() => process.exit(0), 2000);
  });
