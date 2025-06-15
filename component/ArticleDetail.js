import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import parse from 'html-react-parser';

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/articles/${id}`);
        const data = await response.json();
        if (response.ok) {
          setArticle(data);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to fetch article');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) return <p className="text-center text-gray-600">Loading...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;
  if (!article) return null;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {article.featured_image && (
        <img
          src={article.featured_image}
          alt={article.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}
      <h2 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h2>
      <p className="text-gray-600 mb-2"><strong>Category:</strong> {article.category}</p>
      <p className="text-gray-600 mb-2"><strong>Author:</strong> {article.author_name || 'Anonymous'}</p>
      <div className="prose max-w-none">{parse(article.content)}</div>
    </div>
  );
};

export default ArticleDetail;